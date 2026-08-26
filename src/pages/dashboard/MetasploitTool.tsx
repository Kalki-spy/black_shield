import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal, ChevronLeft, Loader2, Search, XCircle,
  CheckCircle, AlertTriangle, Shield, Copy, Download,
  Globe, Lock, Wifi, Filter, AlertCircle, Settings
} from "lucide-react";

const BACKEND = "/api/metasploit";

type ScanType = "full" | "quick";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface CVE {
  id:       string;
  name:     string;
  severity: Severity;
  cvss:     number;
  desc:     string;
  port:     number;
  service:  string;
}

interface PortInfo {
  port:      number;
  service:   string;
  state:     string;
  banner:    string;
  cves:      CVE[];
  http_info?: Record<string, string | number>;
}

interface ScanResult {
  target:        string;
  ip:            string;
  scan_type:     string;
  ports_scanned: number;
  open_ports:    number;
  scan_time:     number;
  ports:         PortInfo[];
  cves:          CVE[];
  total_cves:    number;
  critical:      number;
  high:          number;
  medium:        number;
  risk_score:    number;
  risk_level:    string;
  http_info:     Record<string, string | number>;
}

const SCAN_STEPS: [number, string][] = [
  [8,  "Resolving target..."],
  [18, "Running port scan..."],
  [40, "Probing open services..."],
  [60, "Matching CVE database..."],
  [78, "Grabbing HTTP fingerprints..."],
  [90, "Calculating risk score..."],
];

const sevColor = (s: Severity) => {
  switch (s) {
    case "CRITICAL": return "bg-red-500/20 text-red-400 border-red-500/40";
    case "HIGH":     return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "MEDIUM":   return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    case "LOW":      return "bg-muted text-muted-foreground border-border";
  }
};

const riskColor = (level: string) => {
  switch (level) {
    case "CRITICAL": return "text-red-400 border-red-500/50 bg-red-500/10";
    case "HIGH":     return "text-orange-400 border-orange-500/50 bg-orange-500/10";
    case "MEDIUM":   return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
    case "LOW":      return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    case "CLEAN":    return "text-green-400 border-green-500/50 bg-green-500/10";
    default:         return "text-muted-foreground border-border bg-muted";
  }
};

export default function MetasploitTool() {
  const navigate = useNavigate();

  const [target, setTarget]         = useState("");
  const [scanType, setScanType]     = useState<ScanType>("quick");
  const [showOptions, setShowOptions] = useState(false);
  const [filterSev, setFilterSev]   = useState<"all" | Severity>("all");

  const [scanning, setScanning]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [copied, setCopied]           = useState(false);

  async function handleScan() {
    const t = target.trim();
    if (!t) return;
    setError(""); setResult(null); setScanning(true); setProgress(0); setFilterSev("all");

    let si = 0;
    const tick = setInterval(() => {
      if (si < SCAN_STEPS.length) {
        setProgress(SCAN_STEPS[si][0]);
        setProgressMsg(SCAN_STEPS[si][1]);
        si++;
      }
    }, scanType === "quick" ? 1500 : 2500);

    try {
      const res  = await fetch(`${BACKEND}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t, scan_type: scanType }),
      });
      const data = await res.json();
      clearInterval(tick);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Scan complete.");
      await new Promise(r => setTimeout(r, 200));
      setResult(data as ScanResult);
    } catch (e: any) {
      clearInterval(tick);
      setError(e.message || "Failed to reach backend. Is metasploit_server.py running?");
    } finally {
      setScanning(false);
    }
  }

  const filteredCVEs = result?.cves.filter(c =>
    filterSev === "all" ? true : c.severity === filterSev
  ) ?? [];

  function exportJSON() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `msf-scan-${result.target}.json`;
    a.click();
  }

  function copyReport() {
    if (!result) return;
    const lines = [
      `Target: ${result.target} (${result.ip})`,
      `Risk: ${result.risk_level} (score: ${result.risk_score}/100)`,
      `Open Ports: ${result.open_ports}`,
      `CVEs Found: ${result.total_cves} (${result.critical} critical, ${result.high} high)`,
      "",
      "Open Ports:",
      ...result.ports.map(p => `  ${p.port}/tcp  ${p.service}  ${p.banner || ""}`),
      "",
      "CVEs:",
      ...result.cves.map(c => `  [${c.severity}] ${c.id} — ${c.name} (port ${c.port})`),
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
        <span className="font-mono text-sm text-red-400">Metasploit Scanner</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Terminal className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">Metasploit Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Port scanning, service fingerprinting, and CVE vulnerability matching
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="Target IP or hostname — e.g. 192.168.1.1 or example.com"
              disabled={scanning}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => setShowOptions(v => !v)}
            title="Toggle options"
            aria-label="Toggle options"
            className={`px-3 py-2.5 rounded-md border font-mono text-xs transition-colors ${
              showOptions
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleScan}
            disabled={scanning || !target.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
              : <><Search className="h-4 w-4" /> Scan</>
            }
          </button>
        </div>

        {/* Options */}
        {showOptions && (
          <div className="pt-3 border-t border-border">
            <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
              Scan Type
            </label>
            <div className="flex gap-2">
              {(["quick", "full"] as ScanType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setScanType(s)}
                  className={`px-4 py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                    scanType === s
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {s === "quick" ? "QUICK (7 ports)" : "FULL (21 ports)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {scanning && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>{progressMsg}</span>
              <span className="text-purple-400">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Risk banner */}
          <div className={`neon-card rounded-lg p-5 border-2 flex items-center gap-4 flex-wrap ${riskColor(result.risk_level)}`}>
            <Shield className="h-8 w-8 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Risk Level</p>
              <p className="text-2xl font-bold font-mono">{result.risk_level}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold">{result.risk_score}<span className="text-sm font-normal">/100</span></p>
              <p className="font-mono text-xs text-muted-foreground">Risk Score</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={copyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors">
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy Report"}
              </button>
              <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs hover:bg-blue-500/20 transition-colors">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="h-5 w-5 text-purple-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.open_ports}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Open Ports</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.critical}</span>
              </div>
              <p className="text-xs font-mono text-red-400">Critical CVEs</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.high}</span>
              </div>
              <p className="text-xs font-mono text-orange-400">High CVEs</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.ports_scanned}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Ports Scanned</p>
            </div>
          </div>

          {/* Target info */}
          <div className="neon-card rounded-lg p-4 flex items-center gap-3 flex-wrap">
            <Globe className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Target</span>
            <span className="font-mono text-sm text-foreground">{result.target}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-sm text-purple-400">{result.ip}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              Scanned in {result.scan_time}s
            </span>
          </div>

          {/* HTTP Info */}
          {result.http_info && Object.keys(result.http_info).length > 0 && (
            <div className="neon-card rounded-lg p-4">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">HTTP Fingerprint</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(result.http_info).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-md bg-muted/20 border border-border">
                    <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{k.replace(/_/g," ")}</p>
                    <p className={`font-mono text-xs mt-0.5 ${
                      v === "missing" ? "text-orange-400" :
                      v === "present" ? "text-green-400" : "text-foreground"
                    }`}>{String(v) || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Ports Table */}
          <div className="neon-card rounded-lg p-5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Open Ports</p>
            {result.ports.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground">No open ports found.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5">
                  <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Port</span>
                  <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Service</span>
                  <span className="col-span-5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Banner</span>
                  <span className="col-span-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">CVEs</span>
                </div>
                {result.ports.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-md bg-muted/20 border border-border hover:border-purple-500/20 transition-colors">
                    <div className="col-span-2">
                      <span className="font-mono text-sm font-bold text-purple-400">{p.port}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">/tcp</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-mono text-xs text-foreground">{p.service}</span>
                    </div>
                    <div className="col-span-5 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground truncate block" title={p.banner}>
                        {p.banner || "—"}
                      </span>
                    </div>
                    <div className="col-span-3">
                      {p.cves.length > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                          <AlertTriangle className="h-3 w-3" /> {p.cves.length} CVE{p.cves.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Clean
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CVE Table */}
          {result.cves.length > 0 && (
            <div className="neon-card rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Vulnerability Report ({result.total_cves} CVEs)
                </p>
                <div className="flex items-center gap-1 p-1 rounded-md bg-muted/40 border border-border">
                  <Filter className="h-3 w-3 text-muted-foreground ml-1" />
                  {(["all", "CRITICAL", "HIGH", "MEDIUM"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterSev(f)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                        filterSev === f
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredCVEs.map((cve, i) => (
                  <div key={i} className="p-3 rounded-md bg-muted/20 border border-border hover:border-purple-500/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border flex-shrink-0 mt-0.5 ${sevColor(cve.severity)}`}>
                        {cve.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground">{cve.id}</span>
                          <span className="font-mono text-xs text-purple-400">{cve.name}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                            CVSS {cve.cvss} · port {cve.port}/{cve.service}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{cve.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Idle info */}
      {!scanning && !result && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Scanner Capabilities</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Port Scanning",       "Probes 7–21 common TCP ports for open services"],
              ["CVE Matching",        "Matches open services against 30+ known vulnerabilities"],
              ["HTTP Fingerprinting", "Detects server software, missing security headers, HSTS"],
              ["Risk Scoring",        "Calculates 0–100 risk score based on severity distribution"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Terminal className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
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