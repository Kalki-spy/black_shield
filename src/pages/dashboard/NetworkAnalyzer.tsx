import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe, Server, Shield, CheckCircle, AlertTriangle, XCircle,
  AlertCircle, Loader2, Download, Copy, BarChart2, Lock, Network,
} from "lucide-react";

const BACKEND = "/api";

interface Finding {
  item: string;
  status: "secure" | "warning" | "vulnerable";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}
interface PortResult {
  port: number; open: boolean; service: string;
  latency: number | null; risk: "low" | "medium" | "high";
}
interface DnsRecord { type: string; value: string }
interface HopResult {
  hop: number; ip: string | null; host: string | null;
  rtt_ms: number | null; status: "intermediate" | "reached" | "timeout";
}
interface NetworkAnalysis {
  host: string; ip: string; timestamp: string;
  dns:  { records: DnsRecord[]; error: string | null };
  ping: { reachable: boolean; min_ms: number | null; avg_ms: number | null; max_ms: number | null; loss_pct: number };
  ports:      PortResult[];
  traceroute: HopResult[];
  findings:   Finding[];
  error?: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "secure")     return <CheckCircle   className="h-4 w-4 text-green-400" />;
  if (status === "warning")    return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  if (status === "vulnerable") return <XCircle       className="h-4 w-4 text-red-400" />;
  return <Shield className="h-4 w-4 text-muted-foreground" />;
};

const statusBadge = (s: string) => {
  if (s === "secure")     return "bg-green-500/10 text-green-400 border border-green-500/30";
  if (s === "warning")    return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
  if (s === "vulnerable") return "bg-red-500/10 text-red-400 border border-red-500/30";
  return "bg-muted text-muted-foreground";
};

const severityBadge = (s: string) => {
  if (s === "low")      return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
  if (s === "medium")   return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
  if (s === "high")     return "bg-orange-500/10 text-orange-400 border border-orange-500/30";
  if (s === "critical") return "bg-red-500/10 text-red-400 border border-red-500/30";
  return "";
};

export default function NetworkAnalyzer() {
  const [hostInput,   setHostInput]   = useState("");
  const [scanning,    setScanning]    = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error,       setError]       = useState("");
  const [result,      setResult]      = useState<NetworkAnalysis | null>(null);
  const [showReport,  setShowReport]  = useState(false);
  const [copied,      setCopied]      = useState(false);

  const steps: [number, string][] = [
    [15, "Resolving hostname..."],
    [30, "Running DNS lookup..."],
    [50, "Pinging host..."],
    [70, "Scanning common ports (parallel)..."],
    [88, "Tracing network path..."],
  ];

  async function handleAnalyze() {
    const host = hostInput.trim();
    if (!host) return;
    setError(""); setResult(null); setShowReport(false);
    setScanning(true); setProgress(0); setProgressMsg("");

    let si = 0;
    const tick = setInterval(() => {
      if (si < steps.length) { setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; }
    }, 1800);

    try {
      const r    = await fetch(`${BACKEND}/network/analyze?host=${encodeURIComponent(host)}`);
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — is ddos_server.py running? Try restarting npm run dev");
      const data: NetworkAnalysis = JSON.parse(text);
      if (data.error) throw new Error(data.error);
      setProgress(100); setProgressMsg("Analysis complete.");
      await new Promise(r2 => setTimeout(r2, 400));
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to reach backend. Is ddos_server.py running on port 8775?");
    } finally {
      clearInterval(tick);
      setScanning(false);
    }
  }

  function exportJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `network-analysis-${result.host}.json`; a.click();
  }

  function copyReport() {
    if (!result) return;
    const lines = [
      `Network Analysis: ${result.host} (${result.ip})`,
      `Timestamp: ${result.timestamp}`,
      "",
      "FINDINGS:",
      ...result.findings.map(f => `[${f.status.toUpperCase()}] ${f.item} — ${f.description}`),
      "",
      "OPEN PORTS:",
      ...result.ports.filter(p => p.open).map(p => `  ${p.port}/${p.service}  ${p.latency ?? ""}ms`),
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  const summary = result?.findings.reduce(
    (a, f) => { a[f.status] = (a[f.status] || 0) + 1; return a; },
    { secure: 0, warning: 0, vulnerable: 0 } as Record<string, number>
  ) ?? { secure: 0, warning: 0, vulnerable: 0 };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span>
        <span className="text-blue-400">Network Analyzer</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Network className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Network Analyzer</h1>
          <p className="text-sm text-muted-foreground">DNS lookup · Ping & RTT · Port scan · Traceroute · Security findings</p>
        </div>
      </div>

      {/* Input */}
      <div className="neon-card rounded-xl p-6 border border-blue-500/20 space-y-4">
        <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Target Host</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="text" value={hostInput}
              onChange={e => setHostInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleAnalyze()}
              placeholder="example.com or 192.168.1.1"
              title="Target hostname or IP address"
              disabled={scanning}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
          </div>
          <button onClick={handleAnalyze} disabled={scanning || !hostInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {scanning ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {scanning && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-mono text-xs text-muted-foreground">{progressMsg}</span>
              <span className="font-mono text-xs text-blue-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-mono text-red-400">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Host overview */}
          <div className="neon-card rounded-xl p-5 border border-blue-500/20">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Server className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-foreground">{result.host}</p>
                  <p className="font-mono text-xs text-muted-foreground">{result.ip}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  result.ping.reachable
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}>
                  {result.ping.reachable ? "● REACHABLE" : "○ UNREACHABLE"}
                </span>
                {result.ping.avg_ms != null && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {result.ping.avg_ms} ms avg
                  </span>
                )}
              </div>
            </div>

            {result.ping.reachable && (
              <div className="grid grid-cols-3 gap-3">
                {([
                  ["Min RTT", result.ping.min_ms, "text-green-400"],
                  ["Avg RTT", result.ping.avg_ms, "text-blue-400"],
                  ["Max RTT", result.ping.max_ms, "text-orange-400"],
                ] as [string, number|null, string][]).map(([label, val, cls]) => (
                  <div key={label} className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                    <p className={`font-mono text-lg font-bold ${cls}`}>{val != null ? `${val}ms` : "—"}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Findings */}
          <div className="neon-card rounded-xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex gap-5">
                {([
                  ["secure",     summary.secure,     "text-green-400"],
                  ["warning",    summary.warning,    "text-yellow-400"],
                  ["vulnerable", summary.vulnerable, "text-red-400"],
                ] as [string, number, string][]).map(([label, val, cls]) => (
                  <div key={label} className="text-center">
                    <div className={`font-mono text-2xl font-bold ${cls}`}>{val}</div>
                    <div className="text-[10px] font-mono text-muted-foreground capitalize">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReport(r => !r)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
                ><BarChart2 className="h-3.5 w-3.5" /> {showReport ? "Hide" : "Report"}</button>
                <button onClick={exportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors"
                ><Download className="h-3.5 w-3.5" /> Export</button>
                <button onClick={copyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
                ><Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}</button>
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border mb-4">
              <span className="text-[10px] font-mono text-muted-foreground">TARGET </span>
              <span className="text-xs font-mono text-blue-400">{result.host}</span>
            </div>

            <div className="space-y-2">
              {result.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:border-blue-500/20 transition-colors">
                  <div className="mt-0.5"><StatusIcon status={f.status} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-foreground">{f.item}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadge(f.status)}`}>{f.status.toUpperCase()}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${severityBadge(f.severity)}`}>{f.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DNS */}
          {result.dns.records.length > 0 && (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// DNS Records</p>
              <div className="space-y-2">
                {result.dns.records.map((rec, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold w-14 text-center ${
                      rec.type==="A"?"bg-blue-500/10 text-blue-400 border border-blue-500/30":
                      rec.type==="AAAA"?"bg-purple-500/10 text-purple-400 border border-purple-500/30":
                      "bg-muted text-muted-foreground border border-border"
                    }`}>{rec.type}</span>
                    <span className="font-mono text-xs text-foreground">{rec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ports */}
          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Port Scan Results</p>
            <div className="space-y-1.5">
              {result.ports.filter(p => p.open).map(p => (
                <div key={p.port} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                  p.risk==="high"?"bg-red-500/5 border-red-500/20":
                  p.risk==="medium"?"bg-yellow-500/5 border-yellow-500/20":
                  "bg-muted/20 border-border"
                }`}>
                  <span className="font-mono text-xs font-bold text-foreground w-14">:{p.port}</span>
                  <span className="font-mono text-xs text-muted-foreground w-24">{p.service}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    p.risk==="high"?"bg-red-500/10 text-red-400 border border-red-500/30":
                    p.risk==="medium"?"bg-yellow-500/10 text-yellow-400 border border-yellow-500/30":
                    "bg-green-500/10 text-green-400 border border-green-500/30"
                  }`}>OPEN</span>
                  {p.latency != null && <span className="text-xs font-mono text-muted-foreground ml-auto">{p.latency.toFixed(1)} ms</span>}
                  {p.risk==="high" && <AlertTriangle className="h-3.5 w-3.5 text-red-400 ml-1 flex-shrink-0" />}
                </div>
              ))}
              {result.ports.filter(p => !p.open).slice(0, 5).map(p => (
                <div key={p.port} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/50 opacity-40">
                  <span className="font-mono text-xs text-muted-foreground w-14">:{p.port}</span>
                  <span className="font-mono text-xs text-muted-foreground w-24">{p.service}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">CLOSED</span>
                </div>
              ))}
            </div>
          </div>

          {/* Traceroute */}
          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Network Path — Traceroute</p>
            <div className="space-y-1.5">
              {result.traceroute.map((hop, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                  hop.status==="reached"?"bg-green-500/5 border-green-500/20":"bg-muted/20 border-border"
                }`}>
                  <span className="font-mono text-xs text-muted-foreground w-6 text-center">{hop.hop}</span>
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    hop.status==="timeout"?"bg-muted-foreground/30":hop.status==="reached"?"bg-green-500":"bg-blue-500"
                  }`} />
                  <span className="font-mono text-xs text-foreground flex-1 truncate">{hop.host ?? hop.ip ?? "* * *"}</span>
                  {hop.ip && hop.ip !== hop.host && <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">{hop.ip}</span>}
                  {hop.rtt_ms != null
                    ? <span className="font-mono text-xs text-blue-400 ml-auto">{hop.rtt_ms} ms</span>
                    : <span className="font-mono text-xs text-muted-foreground/50 ml-auto">timeout</span>}
                  {hop.status==="reached" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/30">DEST</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Full report */}
          {showReport && (
            <div className="neon-card rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-mono text-lg font-bold text-foreground">Network Security Report</h2>
                <p className="text-xs text-muted-foreground mt-1">Generated {new Date().toLocaleString()}</p>
                <p className="font-mono text-xs text-blue-400 mt-0.5">{result.host} ({result.ip})</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {([
                  ["Checks",     result.findings.length, "text-foreground"],
                  ["Secure",     summary.secure,         "text-green-400"],
                  ["Warnings",   summary.warning,        "text-yellow-400"],
                  ["Vulnerable", summary.vulnerable,     "text-red-400"],
                ] as [string, number, string][]).map(([label, val, cls]) => (
                  <div key={label} className="bg-muted/30 rounded-lg p-3 border border-border text-center">
                    <div className={`font-mono text-2xl font-bold ${cls}`}>{val}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Recommendations</p>
                {([
                  ["Close Risky Ports", "Disable Telnet (23), FTP (21), RDP (3389), VNC (5900) if not required. Use SSH tunnels instead.", "text-red-400", "bg-red-500/5 border-red-500/20", Lock],
                  ["Firewall Rules",    "Apply allowlist-based ingress rules. Only expose ports required for public services.",             "text-yellow-400","bg-yellow-500/5 border-yellow-500/20", Shield],
                  ["Best Practices",   "Enable DDoS protection at edge, use rate-limiting, configure ICMP filtering and SYN cookies.",     "text-blue-400",  "bg-blue-500/5 border-blue-500/20",   CheckCircle],
                ] as [string, string, string, string, any][]).map(([title, desc, tc, bg, Icon]) => (
                  <div key={title} className={`flex gap-3 p-3 rounded-lg border ${bg}`}>
                    <Icon className={`h-4 w-4 ${tc} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className={`font-mono text-xs font-bold ${tc} mb-0.5`}>{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!scanning && !result && !error && (
        <div className="neon-card rounded-xl p-6">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">// What We Analyze</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["DNS Records",   "A, AAAA, PTR resolution and reverse lookup"],
              ["Ping / RTT",    "ICMP reachability, min/avg/max round-trip time"],
              ["Port Scanning", "20 common ports tested in parallel with service ID"],
              ["Traceroute",    "Hop-by-hop network path to the target host"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-lg bg-muted/20 border border-border">
                <Network className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
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