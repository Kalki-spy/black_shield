#!/usr/bin/env python3
"""
DDoS Detection + Safe Traffic Simulation Backend
Port: 8775

Endpoints:
GET  /health
GET  /ddos/live
POST /ddos/simulate      (multipart/form-data: attack_type, duration, pps, target)
POST /ddos/stop

Safe Traffic Simulation — Sandbox Only
---------------------------------------
The simulator never sends traffic to arbitrary hosts. All "attack" traffic is
directed at a small loopback-only sandbox target that this process itself
hosts on 127.0.0.1. The target is selected from a fixed backend allowlist
(SANDBOX_TARGETS) — a caller cannot supply an arbitrary host/IP, and any
target value not present in the allowlist is rejected before a simulation
starts. Duration and packets-per-second are clamped server-side regardless
of what a client sends. Source IPs shown in the UI are synthetic addresses
drawn from IANA documentation ranges (RFC 5737 / TEST-NET), never real hosts.

Legacy (kept for backward compatibility with existing routes):
GET  /api/network/network/analyze?host=...
POST /api/network/network/portscan
"""

import json, datetime, time, threading, random, collections, socket, re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import os
PORT = int(os.environ.get("PORT", 8775))

# -----------------------------
# SANDBOX TARGET (backend allowlist — the ONLY valid simulation target)
# -----------------------------
SANDBOX_HOST = "127.0.0.1"
SANDBOX_PORT = int(os.environ.get("DDOS_SANDBOX_PORT", 8795))

SANDBOX_TARGETS = {
    "internal-sandbox": {
        "label": "BlackShield Sandbox Node (internal, loopback-only)",
        "host":  SANDBOX_HOST,
        "port":  SANDBOX_PORT,
    },
}

DURATION_MIN, DURATION_MAX = 5, 60
PPS_MIN, PPS_MAX           = 10, 300
MAX_INFLIGHT               = 60

ATTACK_LABELS = {
    "syn_flood":  "SYN Flood",
    "udp_flood":  "UDP Flood",
    "http_flood": "HTTP GET Flood",
    "icmp_flood": "ICMP Ping Flood",
    "botnet":     "Botnet DDoS",
    "slowloris":  "Slowloris (L7)",
    "amplify":    "Amplification",
    "normal":     "Normal Traffic",
}

ATTACK_PROFILES = {
    "syn_flood":  {"protos": {"TCP": 1.0},                          "ports": [80, 443, 22, 8080], "size": (40, 60)},
    "udp_flood":  {"protos": {"UDP": 1.0},                          "ports": [53, 123, 1900, 19],  "size": (60, 512)},
    "http_flood": {"protos": {"HTTP": 1.0},                         "ports": [80],                  "size": (200, 1500)},
    "icmp_flood": {"protos": {"ICMP": 1.0},                         "ports": [0],                   "size": (32, 64)},
    "botnet":     {"protos": {"TCP": 0.4, "UDP": 0.3, "HTTP": 0.3}, "ports": [80, 443, 53, 22, 8080], "size": (60, 800)},
    "slowloris":  {"protos": {"HTTP": 1.0},                         "ports": [80],                  "size": (10, 50)},
    "amplify":    {"protos": {"UDP": 0.6, "DNS": 0.4},              "ports": [53, 123],              "size": (512, 4096)},
    "normal":     {"protos": {"TCP": 0.4, "HTTPS": 0.4, "DNS": 0.2},"ports": [443, 80, 53],          "size": (60, 400)},
}

# RFC 5737 / documentation-only address blocks — never real, reachable hosts.
TEST_NET_RANGES = ["192.0.2.", "198.51.100.", "203.0.113."]

_lock = threading.Lock()
_traffic_window = collections.deque(maxlen=300)
_ip_counters = {}
_port_counters = {}
_proto_counters = {}
_alert_log = []
_alert_once = set()
_latencies = collections.deque(maxlen=2000)
_total_pkts = 0
_sim_running = False
_sim_thread = None
_stop_event = threading.Event()
_inflight_sem = threading.Semaphore(MAX_INFLIGHT)
_active_conns = 0
_active_conns_lock = threading.Lock()

# -----------------------------
# UTIL
# -----------------------------
def _now_ts():
    return datetime.datetime.now().strftime("%H:%M:%S")

def _json(handler, status, data):
    body = json.dumps(data).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)

def parse_multipart(handler):
    """Minimal multipart/form-data parser for simple text fields (stdlib only)."""
    content_type = handler.headers.get("Content-Type", "")
    if "multipart/form-data" not in content_type:
        return {}
    m = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type)
    if not m:
        return {}
    boundary = (m.group(1) or m.group(2)).strip()
    length = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(length) if length else b""
    fields = {}
    for part in raw.split(("--" + boundary).encode()):
        part = part.strip(b"\r\n")
        if not part or part == b"--":
            continue
        if b"\r\n\r\n" not in part:
            continue
        headers_blob, _, value = part.partition(b"\r\n\r\n")
        name_match = re.search(r'name="([^"]+)"', headers_blob.decode(errors="replace"))
        if not name_match:
            continue
        fields[name_match.group(1)] = value.rstrip(b"\r\n").decode(errors="replace")
    return fields

# -----------------------------
# SANDBOX LISTENER (loopback-only "victim" server for the simulation to hit)
# -----------------------------
def _handle_sandbox_conn(conn):
    global _active_conns
    with _active_conns_lock:
        _active_conns += 1
        load = _active_conns
    try:
        conn.settimeout(2)
        try:
            conn.recv(1024)
        except Exception:
            pass
        # Response degrades as concurrent load increases — demonstrates real
        # strain on the sandbox target without ever leaving the local machine.
        time.sleep(min(0.002 * load, 1.5))
        try:
            conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK")
        except Exception:
            pass
    finally:
        with _active_conns_lock:
            _active_conns -= 1
        try:
            conn.close()
        except Exception:
            pass

def _sandbox_listener():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((SANDBOX_HOST, SANDBOX_PORT))
    srv.listen(128)
    while True:
        try:
            conn, _addr = srv.accept()
        except Exception:
            continue
        threading.Thread(target=_handle_sandbox_conn, args=(conn,), daemon=True).start()

def _hit_sandbox():
    t0 = time.time()
    try:
        with socket.create_connection((SANDBOX_HOST, SANDBOX_PORT), timeout=2) as s:
            s.sendall(b"GET / HTTP/1.1\r\nHost: sandbox\r\n\r\n")
            s.recv(512)
        return (time.time() - t0) * 1000
    except Exception:
        return None

# -----------------------------
# SIMULATION
# -----------------------------
def _weighted_choice(weights: dict) -> str:
    r, cum = random.random(), 0.0
    for k, w in weights.items():
        cum += w
        if r <= cum:
            return k
    return next(reversed(weights))

def _make_ip_pool(attack_type):
    n = 40 if attack_type in ("botnet", "amplify") else 6 if attack_type == "normal" else 3
    pool = set()
    while len(pool) < n:
        pool.add(random.choice(TEST_NET_RANGES) + str(random.randint(2, 254)))
    return list(pool)

def _record_packet(src, port, proto, size):
    global _total_pkts
    _traffic_window.append({"ts": _now_ts(), "src": src, "port": port, "proto": proto, "size": size})
    _ip_counters[src]     = _ip_counters.get(src, 0) + 1
    _port_counters[port]  = _port_counters.get(port, 0) + 1
    _proto_counters[proto] = _proto_counters.get(proto, 0) + 1
    _total_pkts += 1

def _maybe_raise_alerts(attack_type):
    if _total_pkts < 5:
        return
    top_ip, top_count = max(_ip_counters.items(), key=lambda x: x[1])
    ip_ratio = top_count / _total_pkts

    if attack_type != "normal" and _total_pkts >= 15 and "volume" not in _alert_once:
        _alert_once.add("volume")
        _alert_log.append({
            "type": ATTACK_LABELS.get(attack_type, attack_type), "src": top_ip,
            "severity": "critical" if attack_type in ("syn_flood", "botnet", "amplify") else "high",
            "detail": f"Sustained high-volume traffic detected — {_total_pkts} packets captured against the sandbox target.",
            "ts": _now_ts(), "rule": f"packet_count>={_total_pkts}",
        })

    if ip_ratio > 0.4 and "ip_concentration" not in _alert_once:
        _alert_once.add("ip_concentration")
        _alert_log.append({
            "type": "IP Concentration", "src": top_ip, "severity": "high",
            "detail": f"Source {top_ip} responsible for {round(ip_ratio*100)}% of traffic — possible single-origin flood.",
            "ts": _now_ts(), "rule": "top_ip_ratio>40%",
        })

    unique_ips = len(_ip_counters)
    if attack_type in ("botnet", "amplify") and unique_ips > 15 and "distributed" not in _alert_once:
        _alert_once.add("distributed")
        _alert_log.append({
            "type": "Distributed Source Volumetric Attack", "src": f"{unique_ips} unique sources", "severity": "critical",
            "detail": f"{unique_ips} distinct source IPs observed — consistent with botnet or amplification traffic.",
            "ts": _now_ts(), "rule": "unique_ips>15",
        })

    if attack_type == "slowloris" and _total_pkts >= 10 and "slowloris" not in _alert_once:
        _alert_once.add("slowloris")
        _alert_log.append({
            "type": "Layer-7 Slow Connection Exhaustion", "src": top_ip, "severity": "high",
            "detail": "Many small, slow HTTP connections detected — consistent with Slowloris-style resource exhaustion.",
            "ts": _now_ts(), "rule": "small_payload+high_conn_count",
        })

def _hit_and_record(attack_type, profile, ip_pool, stop_event):
    try:
        if stop_event.is_set():
            return
        src   = random.choice(ip_pool)
        proto = _weighted_choice(profile["protos"])
        port  = random.choice(profile["ports"])
        size  = random.randint(*profile["size"])
        lat   = _hit_sandbox()
        with _lock:
            if lat is not None:
                _latencies.append(lat)
            _record_packet(src, port, proto, size)
            _maybe_raise_alerts(attack_type)
    finally:
        _inflight_sem.release()

def run_simulation(attack_type, duration, pps, stop_event):
    global _sim_running
    profile  = ATTACK_PROFILES.get(attack_type, ATTACK_PROFILES["normal"])
    ip_pool  = _make_ip_pool(attack_type)
    interval = 1.0 / max(pps, 1)
    end_time = time.time() + duration

    while time.time() < end_time and not stop_event.is_set():
        if _inflight_sem.acquire(blocking=False):
            threading.Thread(target=_hit_and_record, args=(attack_type, profile, ip_pool, stop_event), daemon=True).start()
        time.sleep(interval)

    with _lock:
        _sim_running = False

def get_live_snapshot():
    with _lock:
        top_ips   = sorted(_ip_counters.items(),   key=lambda x: -x[1])[:10]
        top_ports = sorted(_port_counters.items(), key=lambda x: -x[1])[:10]
        avg_lat   = round(sum(_latencies) / len(_latencies), 2) if _latencies else None
        return {
            "running":        _sim_running,
            "total_pkts":     _total_pkts,
            "recent":         list(_traffic_window)[-50:],
            "alerts":         list(_alert_log)[-30:],
            "top_ips":        [{"ip": ip, "count": c} for ip, c in top_ips],
            "top_ports":      [{"port": p, "count": c} for p, c in top_ports],
            "protocols":      dict(_proto_counters),
            "avg_latency_ms": avg_lat,
        }

def handle_simulate(handler, fields):
    global _sim_running, _sim_thread, _stop_event, _total_pkts

    with _lock:
        if _sim_running:
            _json(handler, 409, {"error": "A simulation is already running. Stop it before starting another."})
            return

    target_key = (fields.get("target") or "internal-sandbox").strip()
    if target_key not in SANDBOX_TARGETS:
        _json(handler, 403, {"error": "Target not permitted. Only the designated sandbox target may be used."})
        return

    attack_type = fields.get("attack_type", "normal")
    if attack_type not in ATTACK_PROFILES:
        attack_type = "normal"

    try:
        duration = int(float(fields.get("duration", 20)))
    except Exception:
        duration = 20
    duration = max(DURATION_MIN, min(duration, DURATION_MAX))

    try:
        pps = int(float(fields.get("pps", 80)))
    except Exception:
        pps = 80
    pps = max(PPS_MIN, min(pps, PPS_MAX))

    with _lock:
        _traffic_window.clear()
        _ip_counters.clear()
        _port_counters.clear()
        _proto_counters.clear()
        _alert_log.clear()
        _alert_once.clear()
        _latencies.clear()
        _total_pkts = 0
        _sim_running = True

    _stop_event = threading.Event()
    _sim_thread = threading.Thread(target=run_simulation, args=(attack_type, duration, pps, _stop_event), daemon=True)
    _sim_thread.start()

    _json(handler, 200, {
        "status": "started", "attack_type": attack_type, "duration": duration,
        "pps": pps, "target": SANDBOX_TARGETS[target_key]["label"],
    })

def handle_stop(handler):
    global _sim_running
    _stop_event.set()
    with _lock:
        _sim_running = False
    _json(handler, 200, {"status": "stopped"})

# -----------------------------
# SIMPLE PORT SCAN (legacy — unrelated frontend page, kept as-is)
# -----------------------------
COMMON_PORTS = {
    80: "HTTP", 443: "HTTPS", 21: "FTP",
    22: "SSH", 25: "SMTP", 53: "DNS",
    110: "POP3", 143: "IMAP", 3306: "MySQL",
    8080: "HTTP-ALT"
}

def scan_ports(host, ports):
    results = []
    for port in ports:
        sock = socket.socket()
        sock.settimeout(0.8)
        start = time.time()
        try:
            sock.connect((host, port))
            latency = (time.time() - start) * 1000
            results.append({
                "port": port,
                "open": True,
                "service": COMMON_PORTS.get(port, "unknown"),
                "latency": round(latency, 2),
                "risk": "medium" if port in [21, 22] else "low"
            })
        except:
            results.append({
                "port": port,
                "open": False,
                "service": COMMON_PORTS.get(port, "unknown"),
                "latency": None,
                "risk": "low"
            })
        sock.close()
    return results

# -----------------------------
# HANDLER
# -----------------------------
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/health":
            return _json(self, 200, {"status": "ok"})

        if path == "/live":
            return _json(self, 200, get_live_snapshot())

        # NETWORK ANALYZER (legacy mock — unrelated to the fixed Network
        # Analyzer page, which now talks to network_server.py; kept as-is)
        if path.startswith("/api/network/network/analyze"):
            params = parse_qs(parsed.query)
            host = params.get("host", [""])[0]

            if not host:
                return _json(self, 400, {"error": "Host required"})

            try:
                ip = socket.gethostbyname(host)
            except:
                return _json(self, 500, {"error": "DNS resolution failed"})

            ports = scan_ports(host, list(COMMON_PORTS.keys()))

            return _json(self, 200, {
                "host": host,
                "ip": ip,
                "timestamp": _now_ts(),
                "dns": {"records": [{"type": "A", "value": ip}], "error": None},
                "ping": {"reachable": True, "min_ms": 20, "avg_ms": 35, "max_ms": 50, "loss_pct": 0},
                "ports": ports,
                "traceroute": [
                    {"hop": 1, "ip": "192.168.1.1", "host": "router", "rtt_ms": 1, "status": "intermediate"},
                    {"hop": 2, "ip": ip, "host": host, "rtt_ms": 35, "status": "reached"},
                ],
                "findings": [
                    {"item": "HTTPS Enabled", "status": "secure", "severity": "low", "description": "SSL configured"},
                    {"item": "Open Ports", "status": "warning", "severity": "medium", "description": "Some ports exposed"},
                ]
            })

        return _json(self, 404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/simulate":
            fields = parse_multipart(self)
            return handle_simulate(self, fields)

        if path == "/stop":
            return handle_stop(self)

        # PORT SCANNER (legacy — unrelated frontend page, kept as-is)
        if path == "/api/network/network/portscan":
            length = int(self.headers.get("Content-Length", 0))
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                body = {}

            host = body.get("host")
            ports_input = body.get("ports")

            if not host:
                return _json(self, 400, {"error": "Host required"})

            try:
                socket.gethostbyname(host)
            except:
                return _json(self, 500, {"error": "Invalid host"})

            if ports_input:
                if "-" in ports_input:
                    start, end = map(int, ports_input.split("-"))
                    ports = list(range(start, end + 1))
                else:
                    ports = [int(p.strip()) for p in ports_input.split(",")]
            else:
                ports = list(COMMON_PORTS.keys())

            results = scan_ports(host, ports)

            return _json(self, 200, {"host": host, "ports": results})

        length = int(self.headers.get("Content-Length", 0))
        if length:
            self.rfile.read(length)
        return _json(self, 404, {"error": "Not found"})

# -----------------------------
# START SERVER
# -----------------------------
if __name__ == "__main__":
    ThreadingHTTPServer.allow_reuse_address = True
    threading.Thread(target=_sandbox_listener, daemon=True).start()
    print(f"🚀 Server running on:{PORT}")
    print(f"🧪 Sandbox target running on {SANDBOX_HOST}:{SANDBOX_PORT} (loopback-only)")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
