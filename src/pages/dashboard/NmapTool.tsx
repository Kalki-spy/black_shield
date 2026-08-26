import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal, ChevronLeft, Loader2, Search, XCircle,
  CheckCircle, AlertTriangle, Shield, Copy, Download,
  Globe, Lock, Wifi, Filter, AlertCircle, Settings,
  Server, Cpu, Clock, Network, Activity, Eye
} from "lucide-react";

const BACKEND = "/api/nmap";

type ScanType = "syn" | "version" | "os" | "aggressive";

interface PortInfo {
  port:      number;
  proto:     string;
  state:     string;
  reason:    string;
  service:   string;
  desc:      string;
  version:   string;
  banner:    string;
  latency:   number;
  http_info?: Record<string, string | number>;
}

interface OsInfo {
  os:         string;
  confidence: number;
  candidates: Record<string, number>;
  method:     string;
}

interface ScanResult {
  target:         string;
  ip:             string;
  rdns:           string;
  scan_type:      string;
  ports_scanned:  number;
  open_ports:     number;
  closed_ports:   number;
  filtered_ports: number;
  scan_time:      number;
  avg_latency:    number;
  ports:          PortInfo[];
  os_info:        OsInfo;
  http_info:      Record<string, string | number>;
  host_up:        boolean;
}

const SCAN_TYPES: { value: ScanType; label: string; flag: string; desc: string }[] = [
  { value: "syn",        label: "SYN Scan",        flag: "-sS", desc: "Fast stealth scan (TCP half-open)" },
  { value: "version",    label: "Version Detection",flag: "-sV", desc: "Probe open ports to determine service versions" },
  { value: "os",         label: "OS Detection",     flag: "-O",  desc: "Enable OS fingerprinting" },
  { value: "aggressive", label: "Aggressive",       flag: "-A",  desc: "OS detection + version + scripts + traceroute" },
];

const SCAN_STEPS: [number, string][] = [
  [5,  "Initiating ARP Ping Scan..."],
  [15, "Scanning target host..."],
  [30, "Discovering open ports..."],
  [50, "Probing service versions..."],
  [65, "Running OS detection..."],
  [80, "Performing script scanning..."],
  [92, "Post-scan analysis..."],
];

const stateColor = (state: string) => {
  switch (state) {
    case "open":           return "text-green-400";
    case "closed":         return "text-red-400";
    case "filtered":       return "text-yellow-400";
    case "open|filtered":  return "text-orange-400";
    default:               return "text-muted-foreground";
  }
};

const osConfColor = (conf: number) => {
  if (conf >= 80) return "text-green-400";
  if (conf >= 50) return "text-yellow-400";
  return "text-orange-400";
};

export default function NmapTool() {
  const navigate = useNavigate();

  const [target, setTarget]           = useState("");
  const [scanType, setScanType]       = useState<ScanType>("syn");
  const [customPorts, setCustomPorts] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showBanners, setShowBanners] = useState(false);

  const [scanning, setScanning]         = useState(false);
  const [progress, setProgress]         = useState(0);
  const [progressMsg, setProgressMsg]   = useState("");
  const [error, setError]               = useState("");
  const [result, setResult]             = useState<ScanResult | null>(null);
  const [copied, setCopied]             = useState(false);

  async function handleScan() {
    const t = target.trim();
    if (!t) return;
    setError(""); setResult(null); setScanning(true); setProgress(0);

    let si = 0;
    const intervalMs = scanType === "aggressive" ? 2800 : scanType === "version" ? 2200 : 1600;
    const tick = setInterval(() => {
      if (si < SCAN_STEPS.length) {
        setProgress(SCAN_STEPS[si][0]);
        setProgressMsg(SCAN_STEPS[si][1]);
        si++;
      }
    }, intervalMs);

    try {
      const ports = customPorts.trim()
        ? customPorts.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : undefined;

      const res = await fetch(`${BACKEND}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t, scan_type: scanType, ...(ports ? { ports } : {}) }),
      });
      const data = await res.json();
      clearInterval(tick);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Nmap done.");
      await new Promise(r => setTimeout(r, 200));
      setResult(data as ScanResult);
    } catch (e: any) {
      clearInterval(tick);
      setError(e.message || "Failed to reach backend. Is nmap_server.py running?");
    } finally {
      setScanning(false);
    }
  }

  function exportGrepable() {
    if (!result) return;
    const lines = [
      `# Nmap scan — ${new Date().toISOString()}`,
      `# Scan type: ${result.scan_type} | Target: ${result.target} (${result.ip})`,
      `Host: ${result.ip} (${result.rdns || result.target})\tStatus: ${result.host_up ? "Up" : "Down"}`,
      `Host: ${result.ip} (${result.rdns || result.target})\tPorts: ` +
        result.ports.map(p =>
          `${p.port}/${p.state}/${p.proto}//${p.service}//${p.version || ""}/`
        ).join(", "),
      `# OS guess: ${result.os_info?.os} (${result.os_info?.confidence}% confidence)`,
      `# ${result.ports_scanned} ports scanned in ${result.scan_time}s`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nmap-scan-${result.target}.gnmap`;
    a.click();
  }

  function copyReport() {
    if (!result) return;
    const lines = [
      `Starting Nmap scan — ${new Date().toUTCString()}`,
      `Host: ${result.ip} (${result.rdns || result.target}) is up (${result.avg_latency}ms latency).`,
      `Not shown: ${result.closed_ports} closed ports`,
      `PORT     STATE  SERVICE  VERSION`,
      ...result.ports.map(p =>
        `${String(p.port).padEnd(8)} ${p.state.padEnd(6)} ${p.service.padEnd(8)} ${p.version || ""}`
      ),
      "",
      `OS: ${result.os_info?.os} (${result.os_info?.confidence}% confidence)`,
      `Nmap done: 1 IP address scanned in ${result.scan_time} seconds`,
    ].join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const activeScanDef = SCAN_TYPES.find(s => s.value === scanType)!;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard/tools")}
          className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Tools
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-sm text-green-400">Nmap Scanner</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Network className="h-5 w-5 text-green-400" />
            </div>
            <h1 className="text-xl font-bold font-mono text-foreground">Nmap Scanner</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono ml-12">
            Network exploration tool and port scanner
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border">
          <Terminal className="h-3.5 w-3.5 text-green-400" />
          <span className="font-mono text-[11px] text-green-400">nmap {activeScanDef.flag} {target || "<target>"}</span>
        </div>
      </div>

      {/* Input card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        {/* Target + scan button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="192.168.1.1, 10.0.0.0/24, scanme.nmap.org"
              className="w-full pl-9 pr-4 py-2.5 rounded-md bg-muted/40 border border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !target.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 font-mono text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {scanning ? "Scanning..." : "Scan"}
          </button>
          <button
            onClick={() => setShowOptions(v => !v)}
            className={`p-2.5 rounded-md border font-mono text-sm transition-all ${
              showOptions
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Scan type row */}
        <div className="flex items-center gap-2 flex-wrap">
          {SCAN_TYPES.map(st => (
            <button
              key={st.value}
              onClick={() => setScanType(st.value)}
              title={st.desc}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold border transition-all ${
                scanType === st.value
                  ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              <span className="opacity-60">{st.flag}</span>
              <span className="ml-1.5">{st.label}</span>
            </button>
          ))}
        </div>

        {/* Advanced options */}
        {showOptions && (
          <div className="pt-3 border-t border-border space-y-3">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Custom Port List</p>
            <input
              value={customPorts}
              onChange={e => setCustomPorts(e.target.value)}
              placeholder="22,80,443,8080  (leave blank for defaults)"
              className="w-full px-3 py-2 rounded-md bg-muted/40 border border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/50 transition-all"
            />
            <p className="text-[10px] text-muted-foreground font-mono">
              Defaults: {scanType === "syn" ? "21 common ports" : "35 common ports"} · Separate with commas
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {scanning && (
        <div className="neon-card rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-green-400 animate-spin" />
              <span className="font-mono text-sm text-green-400">{progressMsg}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            nmap {activeScanDef.flag} {target}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="neon-card rounded-lg p-4 flex items-start gap-3 border-red-500/20 bg-red-500/5">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-sm text-red-400 font-bold">Scan failed</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border">
              {result.host_up
                ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                : <XCircle className="h-3.5 w-3.5 text-red-400" />}
              <span className={`font-mono text-xs font-bold ${result.host_up ? "text-green-400" : "text-red-400"}`}>
                Host {result.host_up ? "Up" : "Down"}
              </span>
            </div>
            <button
              onClick={() => setShowBanners(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-mono text-xs transition-all ${
                showBanners
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Banners
            </button>
            <button
              onClick={copyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-muted-foreground hover:text-foreground font-mono text-xs transition-all"
            >
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={exportGrepable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-muted-foreground hover:text-foreground font-mono text-xs transition-all"
            >
              <Download className="h-3.5 w-3.5" /> .gnmap
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="h-5 w-5 text-green-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.open_ports}</span>
              </div>
              <p className="text-xs font-mono text-green-400">Open Ports</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.closed_ports}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Closed Ports</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-blue-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.avg_latency}</span>
              </div>
              <p className="text-xs font-mono text-blue-400">Avg Latency (ms)</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-purple-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.ports_scanned}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Ports Scanned</p>
            </div>
          </div>

          {/* Host info */}
          <div className="neon-card rounded-lg p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Globe className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Host</span>
            <span className="font-mono text-sm text-foreground">{result.target}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-sm text-green-400">{result.ip}</span>
            {result.rdns && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-sm text-purple-400">{result.rdns}</span>
              </>
            )}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {result.scan_type} scan · {result.scan_time}s
            </span>
          </div>

          {/* OS Detection */}
          {result.os_info && (
            <div className="neon-card rounded-lg p-4">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">OS Detection</p>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-green-400" />
                  <span className="font-mono text-sm font-bold text-foreground">{result.os_info.os}</span>
                  <span className={`font-mono text-xs ${osConfColor(result.os_info.confidence)}`}>
                    ({result.os_info.confidence}% confidence)
                  </span>
                </div>
                {result.os_info.candidates && Object.keys(result.os_info.candidates).length > 1 && (
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {Object.entries(result.os_info.candidates).map(([os, score]) => (
                      <span key={os} className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/30 border border-border text-muted-foreground">
                        {os} ({score}pts)
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-2">{result.os_info.method}</p>
            </div>
          )}

          {/* HTTP Security Headers */}
          {result.http_info && Object.keys(result.http_info).length > 0 && (
            <div className="neon-card rounded-lg p-4">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">HTTP Fingerprint</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(result.http_info).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-md bg-muted/20 border border-border">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{k.replace(/_/g, " ")}</p>
                    <p className={`font-mono text-xs mt-0.5 ${
                      String(v).toUpperCase() === "MISSING" ? "text-orange-400" :
                      v === "present"                       ? "text-green-400"  : "text-foreground"
                    }`}>{String(v) || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Port table — Nmap terminal style */}
          <div className="neon-card rounded-lg p-5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Port Scan Results</p>
            {result.ports.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground">All scanned ports are closed or filtered.</p>
            ) : (
              <div className="space-y-0.5">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5">
                  <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Port/Proto</span>
                  <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">State</span>
                  <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Service</span>
                  <span className="col-span-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Version</span>
                  <span className="col-span-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Latency</span>
                </div>
                {result.ports.map((p, i) => (
                  <div key={i} className="space-y-0">
                    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-md bg-muted/20 border border-border hover:border-green-500/20 transition-colors">
                      <div className="col-span-2">
                        <span className="font-mono text-sm font-bold text-green-400">{p.port}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">/{p.proto}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`font-mono text-xs font-bold ${stateColor(p.state)}`}>{p.state}</span>
                        <span className="block font-mono text-[9px] text-muted-foreground">{p.reason}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-mono text-xs text-foreground">{p.service}</span>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <span className="font-mono text-xs text-purple-400 truncate block" title={p.version}>
                          {p.version || <span className="text-muted-foreground">—</span>}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="font-mono text-xs text-muted-foreground">{p.latency}ms</span>
                      </div>
                    </div>

                    {/* Banner row */}
                    {showBanners && p.banner && (
                      <div className="mx-3 px-3 py-1.5 rounded-b-md bg-black/40 border-x border-b border-green-500/10">
                        <span className="font-mono text-[10px] text-green-300/70 break-all">{p.banner}</span>
                      </div>
                    )}

                    {/* HTTP info sub-row */}
                    {p.http_info && Object.keys(p.http_info).length > 0 && (
                      <div className="mx-3 px-3 py-2 rounded-b-md bg-muted/10 border-x border-b border-border grid grid-cols-3 md:grid-cols-6 gap-1.5">
                        {Object.entries(p.http_info).slice(0, 6).map(([k, v]) => (
                          <div key={k}>
                            <p className="text-[8px] font-mono text-muted-foreground uppercase">{k.replace(/_/g," ")}</p>
                            <p className={`font-mono text-[10px] ${
                              String(v).toUpperCase() === "MISSING" ? "text-orange-400" :
                              v === "present"                       ? "text-green-400"  : "text-foreground"
                            }`}>{String(v) || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary line — Nmap style */}
          <div className="neon-card rounded-lg p-3 border-green-500/10">
            <p className="font-mono text-xs text-green-400/80">
              Nmap done: 1 IP address (1 host up) scanned in {result.scan_time} seconds
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              Not shown: {result.closed_ports} closed tcp ports (reset)
            </p>
          </div>
        </>
      )}

      {/* Idle capabilities */}
      {!scanning && !result && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Scanner Capabilities</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Port Discovery",     "TCP connect scan across 21–35 common service ports"],
              ["Version Detection",  "Banner grabbing to identify service name and version"],
              ["OS Fingerprinting",  "Heuristic OS guess from open ports and service banners"],
              ["HTTP Analysis",      "Security header audit: HSTS, CSP, X-Frame-Options and more"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Terminal className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
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
