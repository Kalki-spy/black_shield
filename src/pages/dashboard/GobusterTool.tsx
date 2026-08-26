import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderSearch, ChevronLeft, Loader2, Search, XCircle,
  CheckCircle, AlertTriangle, Shield, Lock, Download,
  Copy, ExternalLink, Filter, AlertCircle, Globe,
  FileText, FolderOpen, Settings
} from "lucide-react";

const BACKEND = "/api/gobuster";

type ScanMode = "dir" | "file" | "both";
type Flag = "found" | "redirect" | "forbidden" | "auth_required" | "error" | "other";

interface ScanResult {
  url: string;
  path: string;
  status: number;
  flag: Flag;
  size: string;
  type: string;
  redirect: string | null;
  sensitive: boolean;
  scan_type: "dir" | "file";
}

interface ScanResponse {
  target: string;
  hostname: string;
  mode: ScanMode;
  extensions: string[];
  total_probed: number;
  total_found: number;
  flag_counts: Record<string, number>;
  results: ScanResult[];
}

const SCAN_STEPS: [number, string][] = [
  [8,  "Resolving target host..."],
  [18, "Building wordlist..."],
  [30, "Probing directories..."],
  [50, "Scanning for files..."],
  [68, "Checking sensitive paths..."],
  [80, "Analysing responses..."],
  [88, "Finalising results..."],
];

const flagStyle = (flag: Flag) => {
  switch (flag) {
    case "found":        return { badge: "bg-green-500/10 text-green-400 border-green-500/30",  dot: "bg-green-400" };
    case "redirect":     return { badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",     dot: "bg-blue-400"  };
    case "forbidden":    return { badge: "bg-orange-500/10 text-orange-400 border-orange-500/30", dot: "bg-orange-400" };
    case "auth_required":return { badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-400" };
    case "error":        return { badge: "bg-red-500/10 text-red-400 border-red-500/30",        dot: "bg-red-400"   };
    default:             return { badge: "bg-muted text-muted-foreground border-border",         dot: "bg-muted-foreground" };
  }
};

const flagLabel = (flag: Flag) => {
  switch (flag) {
    case "found":         return "FOUND";
    case "redirect":      return "REDIRECT";
    case "forbidden":     return "FORBIDDEN";
    case "auth_required": return "AUTH";
    case "error":         return "ERROR";
    default:              return "OTHER";
  }
};

const statusColor = (code: number) => {
  if (code >= 200 && code < 300) return "text-green-400";
  if (code >= 300 && code < 400) return "text-blue-400";
  if (code === 401 || code === 403) return "text-orange-400";
  if (code >= 500) return "text-red-400";
  return "text-muted-foreground";
};

export default function GobusterTool() {
  const navigate = useNavigate();

  const [targetUrl, setTargetUrl]     = useState("");
  const [mode, setMode]               = useState<ScanMode>("dir");
  const [extensions, setExtensions]   = useState("php,html,txt,js,json");
  const [threads, setThreads]         = useState(30);
  const [showOptions, setShowOptions] = useState(false);

  const [scanning, setScanning]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [result, setResult]           = useState<ScanResponse | null>(null);

  const [filterFlag, setFilterFlag]   = useState<"all" | Flag>("all");
  const [filterSensitive, setFilterSensitive] = useState(false);
  const [copied, setCopied]           = useState(false);

  async function handleScan() {
    const url = targetUrl.trim();
    if (!url) return;

    setError(""); setResult(null); setScanning(true); setProgress(0);
    setFilterFlag("all"); setFilterSensitive(false);

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
      if (currentPct >= 88 && currentPct < 96) {
        currentPct += 1;
        setProgress(p => Math.min(p + 1, 96));
        setProgressMsg("Waiting for scan to complete...");
      }
    }, 4000);

    try {
      const params = new URLSearchParams({
        url,
        mode,
        ext:     extensions,
        threads: String(threads),
      });
      const res  = await fetch(`${BACKEND}/scan?${params}`);
      const data = await res.json();
      clearInterval(tick);
      clearInterval(nudge);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Scan complete.");
      await new Promise(r => setTimeout(r, 300));
      setResult(data as ScanResponse);
    } catch (e: any) {
      clearInterval(tick);
      clearInterval(nudge);
      setError(e.message || "Failed to reach backend. Is gobuster_server.py running?");
    } finally {
      setScanning(false);
    }
  }

  const filtered = result?.results.filter(r => {
    if (filterSensitive && !r.sensitive) return false;
    if (filterFlag !== "all" && r.flag !== filterFlag) return false;
    return true;
  }) ?? [];

  function exportJSON() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gobuster-${result.hostname}.json`;
    a.click();
  }

  function exportCSV() {
    if (!result) return;
    const rows = [
      "path,status,flag,size,type,sensitive,redirect",
      ...result.results.map(r =>
        `${r.path},${r.status},${r.flag},${r.size},${r.type},${r.sensitive},${r.redirect ?? ""}`
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gobuster-${result.hostname}.csv`;
    a.click();
  }

  function copyPaths() {
    if (!result) return;
    navigator.clipboard.writeText(result.results.map(r => r.url).join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sensitiveCount = result?.results.filter(r => r.sensitive).length ?? 0;

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
        <span className="font-mono text-sm text-red-400">Directory Scanner</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <FolderSearch className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">Directory Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Web content discovery via wordlist brute-force (Gobuster-style)
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </span>
            <input
              type="text"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="https://example.com"
              disabled={scanning}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => setShowOptions(v => !v)}
            className={`px-3 py-2.5 rounded-md border font-mono text-xs transition-colors ${
              showOptions
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Scan options"
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
              : <><Search className="h-4 w-4" /> Scan</>
            }
          </button>
        </div>

        {/* Options panel */}
        {showOptions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border">
            {/* Mode */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Scan Mode
              </label>
              <div className="flex gap-1">
                {(["dir", "file", "both"] as ScanMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold transition-colors border ${
                      mode === m
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Extensions */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Extensions (file mode)
              </label>
              <input
                type="text"
                value={extensions}
                onChange={e => setExtensions(e.target.value)}
                placeholder="php,html,txt,js"
                disabled={mode === "dir"}
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-xs font-mono text-foreground disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>

            {/* Threads */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Threads: <span className="text-red-400">{threads}</span>
              </label>
              <input
              type="range"
              id="threads-slider"
              min={5}
              max={50}
              step={5}
              value={threads}
              onChange={e => setThreads(Number(e.target.value))}
              aria-label="Number of threads"
              title="Number of threads"
              className="w-full accent-red-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
                <span>5</span><span>50</span>
              </div>
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
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-5 w-5 text-red-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.total_probed}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Probed</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.total_found}</span>
              </div>
              <p className="text-xs font-mono text-green-400">Discovered</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{sensitiveCount}</span>
              </div>
              <p className="text-xs font-mono text-yellow-400">Sensitive</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-5 w-5 text-orange-400" />
                <span className="font-mono text-2xl font-bold text-foreground">
                  {(result.flag_counts["forbidden"] ?? 0) + (result.flag_counts["auth_required"] ?? 0)}
                </span>
              </div>
              <p className="text-xs font-mono text-orange-400">Restricted</p>
            </div>
          </div>

          {/* Target info */}
          <div className="neon-card rounded-lg p-4 flex items-center gap-3 flex-wrap">
            <Globe className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Target</span>
            <span className="font-mono text-sm text-foreground">{result.target}</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              Mode: <span className="text-red-400">{result.mode.toUpperCase()}</span>
              {result.mode !== "dir" && (
                <> · Ext: <span className="text-red-400">{result.extensions.join(", ")}</span></>
              )}
            </span>
          </div>

          {/* Flag breakdown */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.flag_counts).map(([flag, count]) => {
              const s = flagStyle(flag as Flag);
              return (
                <div key={flag} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono ${s.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {flagLabel(flag as Flag)} <span className="opacity-60">×{count}</span>
                </div>
              );
            })}
          </div>

          {/* Results table */}
          <div className="neon-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FolderSearch className="h-4 w-4 text-red-400" />
                <h2 className="font-mono text-sm font-semibold text-foreground uppercase tracking-wider">
                  Discovered Paths
                </h2>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterSensitive(v => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                    filterSensitive
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <AlertCircle className="h-3 w-3" /> SENSITIVE
                </button>

                <div className="flex items-center gap-1 p-1 rounded-md bg-muted/40 border border-border">
                  <Filter className="h-3 w-3 text-muted-foreground ml-1" />
                  {(["all", "found", "redirect", "forbidden", "auth_required"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterFlag(f)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        filterFlag === f
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "auth_required" ? "AUTH" : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export row */}
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <button
                onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> JSON
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs hover:bg-blue-500/20 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={copyPaths}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy URLs"}
              </button>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 mb-1">
              <span className="col-span-5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Path</span>
              <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Status</span>
              <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Flag</span>
              <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Type</span>
              <span className="col-span-1 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Size</span>
            </div>

            {/* Rows */}
            <div className="space-y-1 max-h-[560px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-mono text-sm">
                  No results for this filter.
                </div>
              ) : (
                filtered.map((r, i) => {
                  const style = flagStyle(r.flag);
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-md border transition-colors group ${
                        r.sensitive
                          ? "bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40"
                          : "bg-muted/20 border-border hover:border-red-500/20"
                      }`}
                    >
                      {/* Path */}
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        {r.scan_type === "dir"
                          ? <FolderOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          : <FileText   className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        }
                        <span className="font-mono text-xs text-foreground truncate" title={r.path}>
                          {r.path}
                        </span>
                        {r.sensitive && (
                          <div title="Sensitive path">
                            <AlertCircle className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                          </div>
                        )}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                        </a>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span className={`font-mono text-xs font-bold ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </div>

                      {/* Flag */}
                      <div className="col-span-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${style.badge}`}>
                          {flagLabel(r.flag)}
                        </span>
                      </div>

                      {/* Content-Type */}
                      <div className="col-span-2 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground truncate block" title={r.type}>
                          {r.type === "—" ? "—" : r.type.split("/").pop()}
                        </span>
                      </div>

                      {/* Size */}
                      <div className="col-span-1">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {r.size === "—" ? "—" : Number(r.size) > 1024
                            ? `${(Number(r.size) / 1024).toFixed(1)}k`
                            : `${r.size}b`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Idle info */}
      {!scanning && !result && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Scan Capabilities
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Directory Mode",    "Brute-forces common directory names against the target"],
              ["File Mode",         "Appends extensions to wordlist to find hidden files"],
              ["Sensitive Detection","Flags .env, .git, config files, and credentials automatically"],
              ["Status Analysis",   "Categorises 200/301/401/403/500 responses with context"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <FolderSearch className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
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