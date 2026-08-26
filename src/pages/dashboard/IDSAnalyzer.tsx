import { useState, useRef } from "react";
import { ShieldCheck, Link2, Upload, Search, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy, Download, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const API = "/api/ids";

interface EngineResult {
  category: "malicious" | "suspicious" | "harmless" | "undetected";
  result: string | null;
  method: string;
  engine_version: string;
}

interface ScanResult {
  source: string;
  scan_type: string;
  target: string;
  meta: Record<string, any>;
  stats: { malicious: number; suspicious: number; harmless: number; undetected: number; total: number };
  verdict: "malicious" | "suspicious" | "clean";
  results: Record<string, EngineResult>;
  scan_date: string;
}

type Tab = "url" | "file";
type FilterCat = "all" | "malicious" | "suspicious" | "harmless";

const verdictConfig = {
  malicious: { label: "MALICIOUS", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40", icon: XCircle },
  suspicious: { label: "SUSPICIOUS", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/40", icon: AlertTriangle },
  clean: { label: "CLEAN", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/40", icon: CheckCircle },
};

const catColor: Record<string, string> = {
  malicious:  "bg-red-500/20 text-red-400 border-red-500/30",
  suspicious: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  harmless:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  undetected: "bg-muted text-muted-foreground border-border",
};

export default function IDSAnalyzer() {
  const [tab, setTab] = useState<Tab>("url");
  const [urlInput, setUrlInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterCat>("all");
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleScan() {
    setError("");
    setResult(null);
    setShowAll(false);

    const target = tab === "url" ? urlInput.trim() : (fileName || "");
    if (!target) { setError("Please enter a URL or select a file."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, scan_type: tab }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Server returned ${res.status}`);
      }
      const data: ScanResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to connect to IDS server. Is it running on port 8774?");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = ev => setFileContent(ev.target?.result as string || "");
    reader.readAsText(f);
  }

  function copyReport() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ids-scan-${Date.now()}.json`;
    a.click();
  }

  const vc = result ? verdictConfig[result.verdict] : null;
  const VIcon = vc?.icon || CheckCircle;

  const filteredEngines = result
    ? Object.entries(result.results).filter(([, v]) => filter === "all" || v.category === filter)
    : [];
  const displayedEngines = showAll ? filteredEngines : filteredEngines.slice(0, 20);

  const detections = result ? Object.entries(result.results).filter(([, v]) => v.category === "malicious" || v.category === "suspicious") : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span>
        <span className="text-primary">IDS Analyzer</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-6 w-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Intrusion Detection System</h1>
          <p className="text-sm text-muted-foreground">VirusTotal file/URL scanning · Threat detection across 70+ engines</p>
        </div>
      </div>

      {/* Scan Card */}
      <div className="neon-card rounded-xl p-6 border border-violet-500/20">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setTab("url"); setError(""); setResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-colors border ${tab === "url" ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "text-muted-foreground border-border hover:text-foreground"}`}
          >
            <Link2 className="h-4 w-4" /> Scan URL
          </button>
          <button
            onClick={() => { setTab("file"); setError(""); setResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-colors border ${tab === "file" ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "text-muted-foreground border-border hover:text-foreground"}`}
          >
            <Upload className="h-4 w-4" /> Scan File
          </button>
        </div>

        {/* Input */}
        {tab === "url" ? (
          <div className="flex gap-2">
            <input
              id="ids-url-input"
              title="URL to scan"
              placeholder="https://www.example.com"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
            <button
              onClick={handleScan}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-sm font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Scanning…" : "Scan"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-border hover:border-violet-500/50 transition-colors cursor-pointer"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="font-mono text-sm text-muted-foreground">
                {fileName ? <span className="text-violet-300">{fileName}</span> : "Click to select a file"}
              </p>
              <p className="text-xs text-muted-foreground">Any file type · Max 32MB</p>
              <input ref={fileRef} type="file" title="Select file to scan" className="hidden" onChange={handleFile} />
            </div>
            {fileName && (
              <button
                onClick={handleScan}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-sm font-semibold hover:bg-violet-500/30 transition-colors disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Scanning…" : "Scan File"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-5 space-y-3 animate-pulse">
            <div className="h-4 bg-muted/40 rounded w-1/3" />
            <div className="h-4 bg-muted/40 rounded w-2/3" />
            <div className="h-4 bg-muted/40 rounded w-1/2" />
          </div>
        )}
      </div>

      {/* Results */}
      {result && vc && (
        <>
          {/* Verdict banner */}
          <div className={`neon-card rounded-xl p-6 border ${vc.border} ${vc.bg}`}>
            <div className="flex items-center gap-4 flex-wrap">
              <VIcon className={`h-10 w-10 ${vc.color} flex-shrink-0`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`font-mono text-2xl font-bold ${vc.color}`}>{vc.label}</span>
                  {result.source === "simulation" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-muted border border-border text-muted-foreground">SIMULATED</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-mono mt-0.5 truncate max-w-lg">{result.target}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyReport} title="Copy JSON" aria-label="Copy report as JSON" className="p-2 rounded-lg bg-muted/30 border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={downloadReport} title="Download JSON" aria-label="Download report as JSON" className="p-2 rounded-lg bg-muted/30 border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { label: "Malicious",  value: result.stats.malicious,  color: "text-red-400" },
                { label: "Suspicious", value: result.stats.suspicious, color: "text-orange-400" },
                { label: "Harmless",   value: result.stats.harmless,   color: "text-emerald-400" },
                { label: "Total Engines", value: result.stats.total,   color: "text-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-background/40 rounded-lg p-3 text-center border border-border">
                  <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Detection bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                <span>Detection rate</span>
                <span>{result.stats.malicious}/{result.stats.total} engines</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.verdict === "malicious" ? "bg-red-500" : result.verdict === "suspicious" ? "bg-orange-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.round((result.stats.malicious / result.stats.total) * 100)}%` }}
                />
              </div>
            </div>

            {/* Scan meta */}
            <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-muted-foreground">
              <Clock className="h-3 w-3" />
              Scanned {new Date(result.scan_date).toLocaleString()}
            </div>
          </div>

          {/* Detections summary (if any) */}
          {detections.length > 0 && (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">// Detections ({detections.length})</p>
              <div className="space-y-2">
                {detections.map(([eng, v]) => (
                  <div key={eng} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${catColor[v.category]}`}>
                      {v.category.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground w-40 flex-shrink-0">{eng}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{v.result || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full engine table */}
          <div className="neon-card rounded-xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">// Engine Results</p>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "malicious", "suspicious", "harmless"] as FilterCat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors ${filter === f ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "bg-muted text-muted-foreground border-border hover:text-foreground"}`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {displayedEngines.map(([eng, v]) => (
                <div key={eng} className="flex items-center gap-3 p-2 rounded-md bg-muted/10 border border-border/50">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border w-24 text-center flex-shrink-0 ${catColor[v.category]}`}>
                    {v.category.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-foreground w-36 flex-shrink-0">{eng}</span>
                  <span className="font-mono text-xs text-muted-foreground truncate flex-1">{v.result || "—"}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/50 flex-shrink-0">{v.engine_version}</span>
                </div>
              ))}
            </div>

            {filteredEngines.length > 20 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1.5 mt-3 mx-auto text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAll ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show all {filteredEngines.length} engines</>}
              </button>
            )}

            {filteredEngines.length === 0 && (
              <p className="text-center text-sm font-mono text-muted-foreground py-4">No engines in this category.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}