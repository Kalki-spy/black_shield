import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database, ChevronLeft, Loader2, XCircle,
  CheckCircle, AlertTriangle, Download,
  Copy, ExternalLink, AlertCircle, Globe,
  Settings, Zap, Lock,
} from "lucide-react";

const BACKEND = "/api/sqlmap";

type Severity = "critical" | "high" | "medium" | "low";
type InjType  = "error_based" | "boolean_blind" | "time_based" | "union_based" | "stacked" | "out_of_band";

interface ParamResult {
  name:          string;
  vulnerable:    boolean;
  finding_count: number;
}

interface Finding {
  parameter:      string;
  payload:        string;
  injection_type: InjType;
  description:    string;
  evidence:       string;
  status_code:    number;
  response_time:  number;
  injected_url:   string;   // matches backend field name
  severity:       Severity;
  risk:           string;
}

interface ScanResponse {
  target:          string;
  hostname:        string;
  baseline_status: number;
  baseline_time:   number;
  db_detected:     string;
  params_tested:   ParamResult[];
  total_payloads:  number;
  total_findings:  number;
  vulnerable:      boolean;
  findings:        Finding[];
}

const SCAN_STEPS: [number, string][] = [
  [8,  "Resolving target..."],
  [18, "Fetching baseline response..."],
  [30, "Testing error-based payloads..."],
  [45, "Testing boolean-blind payloads..."],
  [60, "Testing time-based payloads..."],
  [72, "Testing UNION-based payloads..."],
  [82, "Analysing responses..."],
  [88, "Correlating findings..."],
];

const SEV_STYLE: Record<Severity, { badge: string; dot: string; label: string }> = {
  critical: { badge: "bg-red-500/10 text-red-400 border-red-500/30",          dot: "bg-red-400",    label: "CRITICAL" },
  high:     { badge: "bg-orange-500/10 text-orange-400 border-orange-500/30", dot: "bg-orange-400", label: "HIGH"     },
  medium:   { badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-400", label: "MEDIUM"   },
  low:      { badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",       dot: "bg-blue-400",   label: "LOW"      },
};

const INJ_LABEL: Record<InjType, string> = {
  error_based:   "Error-Based",
  boolean_blind: "Boolean Blind",
  time_based:    "Time-Based Blind",
  union_based:   "UNION-Based",
  stacked:       "Stacked Queries",
  out_of_band:   "Out-of-Band",
};

const INJ_COLOR: Record<InjType, string> = {
  error_based:   "text-red-400",
  boolean_blind: "text-orange-400",
  time_based:    "text-yellow-400",
  union_based:   "text-purple-400",
  stacked:       "text-red-400",
  out_of_band:   "text-red-400",
};

export default function SQLMapTool() {
  const navigate = useNavigate();

  const [targetUrl,    setTargetUrl]    = useState("");
  const [paramList,    setParamList]    = useState("");
  const [level,        setLevel]        = useState(2);
  const [showOptions,  setShowOptions]  = useState(false);
  const [scanning,     setScanning]     = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [progressMsg,  setProgressMsg]  = useState("");
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState<ScanResponse | null>(null);
  const [activeParam,  setActiveParam]  = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  async function handleScan() {
    const url = targetUrl.trim();
    if (!url) return;

    setError(""); setResult(null); setScanning(true);
    setProgress(0); setActiveParam(null);

    let si = 0;
    let currentPct = 0;

    const tick = setInterval(() => {
      if (si < SCAN_STEPS.length) {
        currentPct = SCAN_STEPS[si][0];
        setProgress(currentPct);
        setProgressMsg(SCAN_STEPS[si][1]);
        si++;
      }
    }, 3000);

    const nudge = setInterval(() => {
      if (currentPct >= 88 && currentPct < 99) {
        currentPct += 1;
        setProgress(p => Math.min(p + 1, 99));
        setProgressMsg("Waiting for injection tests to complete...");
      }
    }, 5000);

    try {
      const params = new URLSearchParams({ url, level: String(level) });
      if (paramList.trim()) params.set("params", paramList.trim());

      const res  = await fetch(`${BACKEND}/scan?${params}`);
      const data = await res.json();
      clearInterval(tick);
      clearInterval(nudge);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Scan complete.");
      await new Promise(r => setTimeout(r, 300));
      setResult(data as ScanResponse);
    } catch (e: unknown) {
      clearInterval(tick);
      clearInterval(nudge);
      const msg = e instanceof Error ? e.message : "Failed to reach backend. Is sqlmap_server.py running?";
      setError(msg);
    } finally {
      setScanning(false);
    }
  }

  const shownFindings = result?.findings.filter(
    f => !activeParam || f.parameter === activeParam
  ) ?? [];

  function exportJSON() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sqli-${result.hostname}.json`;
    a.click();
  }

  function copyPayloads() {
    if (!result) return;
    const text = result.findings
      .map(f => `[${f.parameter}] ${f.injection_type}: ${f.payload}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const critCount = result?.findings.filter(f => f.severity === "critical").length ?? 0;
  const highCount = result?.findings.filter(f => f.severity === "high").length ?? 0;

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
        <span className="font-mono text-sm text-red-400">SQL Injection Scanner</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">SQL Injection Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Automatic detection — error-based, boolean blind, time-based &amp; UNION
          </p>
        </div>
      </div>

      {/* Input card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="https://example.com/page?id=1&user=admin"
              disabled={scanning}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => setShowOptions(v => !v)}
            className={`px-3 py-2.5 rounded-md border transition-colors ${
              showOptions
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleScan}
            disabled={scanning || !targetUrl.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
              : <><Zap className="h-4 w-4" /> Scan</>
            }
          </button>
        </div>

        {/* Options panel */}
        {showOptions && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Parameters (comma-separated, blank = auto-detect)
              </label>
              <input
                type="text"
                value={paramList}
                onChange={e => setParamList(e.target.value)}
                placeholder="id, user, search"
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Scan Level: <span className="text-red-400">{["", "LOW", "MEDIUM", "HIGH"][level]}</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3].map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      level === l
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {["LOW", "MEDIUM", "HIGH"][l - 1]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                {level === 1 && "10 payloads — fastest, basic detection"}
                {level === 2 && "20 payloads — balanced speed and coverage"}
                {level === 3 && "All payloads — thorough but slower"}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {scanning && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>{progressMsg}</span>
              <span className="text-red-400">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Verdict banner */}
          <div className={`neon-card rounded-lg p-4 flex items-center gap-4 border-l-4 ${
            result.vulnerable ? "border-l-red-500 bg-red-500/5" : "border-l-green-500 bg-green-500/5"
          }`}>
            {result.vulnerable
              ? <XCircle    className="h-8 w-8 text-red-400 flex-shrink-0" />
              : <CheckCircle className="h-8 w-8 text-green-400 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-lg font-bold ${result.vulnerable ? "text-red-400" : "text-green-400"}`}>
                {result.vulnerable ? "VULNERABLE" : "No Injection Detected"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {result.vulnerable
                  ? `${result.total_findings} injection point${result.total_findings !== 1 ? "s" : ""} confirmed across ${result.params_tested.filter(p => p.vulnerable).length} parameter${result.params_tested.filter(p => p.vulnerable).length !== 1 ? "s" : ""}`
                  : `Tested ${result.total_payloads} payloads across ${result.params_tested.length} parameter${result.params_tested.length !== 1 ? "s" : ""} — clean`
                }
              </p>
            </div>
            {result.db_detected !== "Unknown" && (
              <div className="px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 flex-shrink-0">
                <p className="text-[10px] font-mono text-muted-foreground">DB Engine</p>
                <p className="font-mono text-sm font-bold text-purple-400">{result.db_detected}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-red-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.total_payloads}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Payloads Tested</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-5 w-5 text-blue-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.params_tested.length}</span>
              </div>
              <p className="text-xs font-mono text-blue-400">Parameters</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{critCount}</span>
              </div>
              <p className="text-xs font-mono text-red-400">Critical</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{highCount}</span>
              </div>
              <p className="text-xs font-mono text-orange-400">High</p>
            </div>
          </div>

          {/* Target bar */}
          <div className="neon-card rounded-lg p-4 flex items-center gap-3 flex-wrap">
            <Globe className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Target</span>
            <span className="font-mono text-xs text-foreground truncate max-w-xs" title={result.target}>
              {result.target}
            </span>
            <div className="ml-auto flex gap-4 text-[10px] font-mono flex-shrink-0">
              <span className="text-muted-foreground">
                Status: <span className="text-green-400">{result.baseline_status}</span>
              </span>
              <span className="text-muted-foreground">
                RT: <span className="text-blue-400">{result.baseline_time}s</span>
              </span>
              <span className="text-muted-foreground">
                Level: <span className="text-red-400">{["", "LOW", "MEDIUM", "HIGH"][level]}</span>
              </span>
            </div>
          </div>

          {/* Param filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveParam(null)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
                !activeParam
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              ALL PARAMS
            </button>
            {result.params_tested.map(p => (
              <button
                key={p.name}
                onClick={() => setActiveParam(activeParam === p.name ? null : p.name)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
                  activeParam === p.name
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : p.vulnerable
                      ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {p.vulnerable && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                {p.name}
                {p.vulnerable && <span className="opacity-60">×{p.finding_count}</span>}
              </button>
            ))}
          </div>

          {/* Findings list */}
          {result.total_findings > 0 && (
            <div className="neon-card rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <h2 className="font-mono text-sm font-semibold text-foreground uppercase tracking-wider">
                    Injection Points
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({shownFindings.length} shown)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> JSON
                  </button>
                  <button
                    onClick={copyPayloads}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy Payloads"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {shownFindings.map((f, i) => {
                  const sev = SEV_STYLE[f.severity] ?? SEV_STYLE.low;
                  return (
                    <div key={i} className="rounded-md border border-border bg-muted/20 overflow-hidden hover:border-red-500/20 transition-colors">
                      {/* Row header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 flex-wrap">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                        <span className="font-mono text-sm font-bold text-foreground">
                          ?<span className="text-red-400">{f.parameter}</span>=
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${sev.badge}`}>
                          {sev.label}
                        </span>
                        <span className={`text-xs font-mono font-semibold ${INJ_COLOR[f.injection_type] ?? "text-muted-foreground"}`}>
                          {INJ_LABEL[f.injection_type] ?? f.injection_type}
                        </span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground flex-shrink-0">
                          {f.status_code} · {f.response_time}s
                        </span>
                      </div>

                      {/* Details */}
                      <div className="px-4 py-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Payload</p>
                          <div className="px-3 py-2 rounded bg-background border border-border font-mono text-xs text-red-300 break-all">
                            {f.payload}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Evidence</p>
                            <p className="text-xs text-foreground">{f.evidence}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Risk</p>
                            <p className="text-xs text-foreground">{f.risk}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex-shrink-0">URL</p>
                          <a
                            href={f.injected_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:text-red-300 truncate"
                          >
                            {f.injected_url.length > 80 ? f.injected_url.slice(0, 80) + "…" : f.injected_url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean result */}
          {result.total_findings === 0 && (
            <div className="neon-card rounded-lg p-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-10 w-10 text-green-400" />
              <p className="font-mono text-sm font-bold text-foreground">No SQL Injection Detected</p>
              <p className="text-xs text-muted-foreground max-w-md">
                {result.total_payloads} payloads tested across {result.params_tested.length} parameter{result.params_tested.length !== 1 ? "s" : ""}.
                No error-based, boolean-blind, time-based, or UNION injection signatures found.
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                Try increasing the scan level or add more parameters manually.
              </p>
            </div>
          )}
        </>
      )}

      {/* Idle state */}
      {!scanning && !result && !error && (
        <div className="neon-card rounded-lg p-5 space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Detection Methods
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Error-Based",      "Triggers DB error messages to confirm injection and fingerprint DB engine"],
              ["Boolean Blind",    "Compares true/false responses to detect blind injection points"],
              ["Time-Based Blind", "Uses SLEEP/WAITFOR delays to confirm blind injection via timing"],
              ["UNION-Based",      "Attempts UNION SELECT to directly extract database content"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Database className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-mono text-xs font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-yellow-400 font-mono font-bold">URL must include query parameters</span>
              {" "}— e.g.{" "}
              <span className="font-mono text-foreground">https://target.com/page?id=1</span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}