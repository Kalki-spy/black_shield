import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert, ShieldCheck, XCircle, AlertTriangle, AlertCircle,
  Activity, Globe, Download, Copy, Play, Square, Zap, Radio,
} from "lucide-react";

const BACKEND = "/api";

interface TrafficPacket { ts: string; src: string; port: number; proto: string; size: number }
interface DDOSAlert {
  type: string; severity: "critical" | "high" | "medium" | "low";
  src: string; detail: string; ts: string; rule: string;
}
interface LiveData {
  running: boolean; total_pkts: number;
  recent:    TrafficPacket[];
  alerts:    DDOSAlert[];
  top_ips:   { ip: string; count: number }[];
  top_ports: { port: number; count: number }[];
  protocols: Record<string, number>;
  avg_latency_ms: number | null;
}

const SANDBOX_TARGET = { id: "internal-sandbox", label: "BlackShield Sandbox Node (internal, loopback-only)" };

const ATTACK_TYPES = [
  { id: "syn_flood",  label: "SYN Flood",         color: "text-rose-400/80",    icon: "⚡" },
  { id: "udp_flood",  label: "UDP Flood",          color: "text-orange-400", icon: "🌊" },
  { id: "http_flood", label: "HTTP GET Flood",     color: "text-yellow-400", icon: "🔁" },
  { id: "icmp_flood", label: "ICMP Ping Flood",    color: "text-pink-400",   icon: "📡" },
  { id: "botnet",     label: "Botnet DDoS",        color: "text-rose-400/80",    icon: "🤖" },
  { id: "slowloris",  label: "Slowloris (L7)",     color: "text-purple-400", icon: "🐌" },
  { id: "amplify",    label: "Amplification",      color: "text-orange-400", icon: "📢" },
  { id: "normal",     label: "Normal Traffic",     color: "text-green-400",  icon: "✅" },
];

const alertSeverityBadge = (s: string) => {
  if (s === "critical") return "bg-red-500/15 text-red-400 border border-red-500/40";
  if (s === "high")     return "bg-orange-500/15 text-orange-400 border border-orange-500/40";
  if (s === "medium")   return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/40";
  return "bg-blue-500/15 text-blue-400 border border-blue-500/40";
};

const alertIcon = (s: string) => {
  if (s === "critical") return <ShieldAlert   className="h-4 w-4 text-red-400 flex-shrink-0" />;
  if (s === "high")     return <XCircle       className="h-4 w-4 text-orange-400 flex-shrink-0" />;
  return                       <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
};

const PROTO_COLORS: Record<string, string> = {
  TCP: "#3b82f6", UDP: "#f97316", HTTP: "#a78bfa",
  HTTPS: "#34d399", ICMP: "#f43f5e", DNS: "#facc15",
  NTP: "#94a3b8", UNKNOWN: "#475569",
};

export default function DDOSSimulator() {
  const [attackType, setAttackType] = useState("syn_flood");
  const [duration,   setDuration]   = useState(20);
  const [pps,        setPps]        = useState(80);
  const [live,       setLive]       = useState<LiveData | null>(null);
  const [error,      setError]      = useState("");
  const [polling,    setPolling]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [live?.recent]);

  const stopPoll = useCallback(() => {
    setPolling(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback(() => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BACKEND}/ddos/live`);
        const d: LiveData = await r.json();
        setLive(d);
        if (!d.running) stopPoll();
      } catch {}
    }, 600);
  }, [stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  async function startSim() {
    setError("");
    try {
      const fd = new FormData();
      fd.append("attack_type", attackType);
      fd.append("duration",    String(duration));
      fd.append("pps",         String(pps));
      fd.append("target",      SANDBOX_TARGET.id);
      const r = await fetch(`${BACKEND}/ddos/simulate`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      startPoll();
    } catch (e: any) {
      setError(e.message || "Failed to reach backend. Is ddos_server.py running on port 8775?");
    }
  }

  async function stopSim() {
    stopPoll();
    try { await fetch(`${BACKEND}/ddos/stop`, { method: "POST" }); } catch {}
    const r = await fetch(`${BACKEND}/ddos/live`).catch(() => null);
    if (r) setLive(await r.json());
  }

  function exportJSON() {
    if (!live) return;
    const blob = new Blob([JSON.stringify(live, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `ddos-report-${attackType}.json`; a.click();
  }

  function copyReport() {
    if (!live) return;
    const lines = [
      `DDoS Detection Report — ${attackType}`,
      `Total packets: ${live.total_pkts}`,
      `Alerts: ${live.alerts.length}`,
      "",
      ...live.alerts.map(a => `[${a.severity.toUpperCase()}] ${a.type}: ${a.detail}`),
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  const isRunning  = live?.running ?? false;
  const totalPkts  = live?.total_pkts ?? 0;
  const alertCount = live?.alerts?.length ?? 0;
  const protoData  = live?.protocols ?? {};
  const protoTotal = Object.values(protoData).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span>
        <span className="text-rose-400/80">DDoS Simulator</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">DDoS Simulator & Detector</h1>
          <p className="text-sm text-muted-foreground">Simulate attack traffic · Real-time detection alerts · Protocol analysis</p>
        </div>
      </div>

      {/* Sandbox safety notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <span className="text-base leading-none">🧪</span>
        <div className="text-xs font-mono">
          <span className="font-bold text-yellow-400">SANDBOX ENVIRONMENT</span>
          <span className="text-muted-foreground"> — Testing is restricted to authorized training targets. </span>
          <span className="text-muted-foreground">Safe Traffic Simulation — Sandbox Only.</span>
        </div>
      </div>

      {/* Config */}
      <div className="neon-card rounded-xl p-6 border border-slate-700/40 bg-slate-900/60 space-y-5">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Sandbox Target</p>
          <select
            value={SANDBOX_TARGET.id}
            disabled
            title="Only the designated sandbox target is available"
            aria-label="Sandbox target"
            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <option value={SANDBOX_TARGET.id}>{SANDBOX_TARGET.label}</option>
          </select>
        </div>

        <p className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest">// Attack Profile</p>

        <div className="grid grid-cols-4 gap-2">
          {ATTACK_TYPES.map(at => (
            <button key={at.id} onClick={() => setAttackType(at.id)} disabled={isRunning}
              className={`p-3 rounded-lg border font-mono text-xs text-left transition-colors disabled:opacity-50 ${
                attackType === at.id
                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                  : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:border-red-500/30"
              }`}
            >
              <div className="text-lg mb-1">{at.icon}</div>
              <div className={`text-[10px] font-bold leading-tight ${attackType === at.id ? "text-rose-400/80" : ""}`}>{at.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Duration</span>
              <span className="text-[10px] font-mono text-red-400 font-bold">{duration}s</span>
            </div>
            <input type="range" min="5" max="60" value={duration} disabled={isRunning}
              title="Simulation duration in seconds"
              aria-label={`Simulation duration: ${duration} seconds`}
              onChange={e => setDuration(+e.target.value)}
              className="w-full accent-red-500 disabled:opacity-50" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Packets/sec</span>
              <span className="text-[10px] font-mono text-red-400 font-bold">{pps} pps</span>
            </div>
            <input type="range" min="10" max="300" value={pps} disabled={isRunning}
              title="Packets per second rate"
              aria-label={`Packets per second: ${pps}`}
              onChange={e => setPps(+e.target.value)}
              className="w-full accent-red-500 disabled:opacity-50" />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={startSim} disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-700/30 text-rose-400/80 font-mono text-sm hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" /> Start Simulation
          </button>
          {isRunning && (
            <button onClick={stopSim}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-muted-foreground font-mono text-sm hover:text-foreground transition-colors"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
          {live && !isRunning && (
            <>
              <button onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors ml-auto"
              ><Download className="h-3.5 w-3.5" /> Export</button>
              <button onClick={copyReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
              ><Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}</button>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-mono text-rose-400/80">{error}</p>
          </div>
        )}
      </div>

      {/* Live stats */}
      {live && (
        <>
          <div className="grid grid-cols-5 gap-3">
            {([
              ["Total Packets", totalPkts,              "text-foreground",  <Activity  className="h-4 w-4 text-muted-foreground" />],
              ["Unique IPs",    live.top_ips.length,    "text-blue-400",    <Globe     className="h-4 w-4 text-blue-400" />],
              ["Alerts",        alertCount, alertCount > 0 ? "text-rose-400/80" : "text-green-400", <ShieldAlert className="h-4 w-4" />],
              ["Status",        isRunning ? "LIVE" : "DONE", isRunning ? "text-rose-400/80" : "text-green-400", <Radio className="h-4 w-4" />],
              ["Sandbox Latency", live.avg_latency_ms != null ? `${live.avg_latency_ms}ms` : "—", "text-yellow-400", <Zap className="h-4 w-4 text-yellow-400" />],
            ] as [string, string|number, string, JSX.Element][]).map(([label, val, cls, icon]) => (
              <div key={label} className="neon-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                  {icon}
                </div>
                <div className={`font-mono text-2xl font-bold ${cls}`}>{val}</div>
                {isRunning && label === "Status" && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-rose-400/80">DETECTING</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="neon-card rounded-xl p-5 space-y-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Protocol Breakdown</p>
              {Object.entries(protoData).sort((a, b) => b[1] - a[1]).map(([proto, cnt]) => {
                const pct = Math.round((cnt / protoTotal) * 100);
                const col = PROTO_COLORS[proto] ?? PROTO_COLORS.UNKNOWN;
                return (
                  <div key={proto}>
                    <div className="flex justify-between mb-0.5">
                      <span className="font-mono text-xs text-foreground">{proto}</span>
                      <span className="font-mono text-xs text-muted-foreground">{cnt} pkts ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: col }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="neon-card rounded-xl p-5 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Top Source IPs</p>
              {live.top_ips.slice(0, 8).map(({ ip, count }) => {
                const pct = Math.round((count / totalPkts) * 100);
                const isHigh = pct > 20;
                return (
                  <div key={ip} className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] w-28 truncate ${isHigh ? "text-rose-400/80" : "text-muted-foreground"}`}>{ip}</span>
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${isHigh ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {live.alerts.length > 0 && (
            <div className="neon-card rounded-xl p-5 space-y-3">
              <p className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest">// DDoS Alerts Triggered ({live.alerts.length})</p>
              {live.alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:border-slate-700/40 transition-colors">
                  {alertIcon(a.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-foreground">{a.type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${alertSeverityBadge(a.severity)}`}>{a.severity.toUpperCase()}</span>
                      <span className="text-[10px] font-mono text-muted-foreground ml-auto">{a.ts}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">Rule: {a.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Live Packet Log</p>
            <div ref={logRef} className="h-48 overflow-y-auto font-mono text-[10px] space-y-0.5" style={{ scrollbarWidth: "thin" }}>
              {live.recent.slice().reverse().map((pkt, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-0.5 rounded hover:bg-muted/20">
                  <span className="text-muted-foreground/60 w-14">{pkt.ts}</span>
                  <span className={`w-20 font-bold ${pkt.proto==="HTTP"||pkt.proto==="HTTPS"?"text-purple-400":pkt.proto==="UDP"?"text-orange-400":pkt.proto==="ICMP"?"text-pink-400":"text-blue-400"}`}>{pkt.proto}</span>
                  <span className="text-muted-foreground w-28 truncate">{pkt.src}</span>
                  <span className="text-muted-foreground">→ :{pkt.port}</span>
                  <span className="text-muted-foreground/50 ml-auto">{pkt.size}B</span>
                </div>
              ))}
              {live.recent.length === 0 && <p className="text-muted-foreground/40 text-center pt-4">Waiting for traffic...</p>}
            </div>
          </div>
        </>
      )}

      {!live && !error && (
        <div className="neon-card rounded-xl p-6">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">// Detection Capabilities</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["SYN / UDP / ICMP Flood", "Detects high-volume packet floods by protocol ratio"],
              ["HTTP Layer-7 Flood",     "Identifies GET flood and Slowloris-style attacks"],
              ["Botnet / Amplification", "Spots high unique-source volumetric attacks"],
              ["IP Concentration",       "Flags single-IP traffic domination (>40%)"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-lg bg-muted/20 border border-border">
                <Zap className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-mono text-xs font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
