import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe, Search, CheckCircle, XCircle, ChevronLeft,
  Loader2, Copy, Download, Network, Database, Shield,
  ExternalLink, Filter
} from "lucide-react";

const BACKEND = "/api/subdomain";

// Matches exactly what subdomain_server.py returns
type Source = "crt.sh" | "wordlist" | "both";

interface Subdomain {
  subdomain: string;
  ip: string | null;
  reverse: string | null;
  source: Source;
}

interface FindResult {
  domain: string;
  input_domain?: string;
  base_ip: string;
  total: number;
  resolved: number;
  subdomains: Subdomain[];
  sources: Record<string, number>;
}

const SCAN_STEPS: [number, string][] = [
  [10, "Resolving base domain..."],
  [25, "Querying certificate transparency logs..."],
  [55, "Running DNS wordlist enumeration..."],
  [80, "Resolving discovered subdomains..."],
  [92, "Aggregating & deduplicating results..."],
];

const sourceBadge = (source: Source) => {
  if (source === "crt.sh")   return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  if (source === "wordlist") return "bg-orange-500/10 text-orange-400 border-orange-500/30";
  if (source === "both")     return "bg-green-500/10 text-green-400 border-green-500/30";
  return "";
};

const sourceLabel = (source: Source) => {
  if (source === "crt.sh")   return "cert";
  if (source === "wordlist") return "brute";
  if (source === "both")     return "both";
  return source;
};

export default function SubdomainFinder() {
  const navigate = useNavigate();
  const [inputDomain, setInputDomain] = useState("");
  const [scanning, setScanning]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [result, setResult]           = useState<FindResult | null>(null);
  const [filter, setFilter]           = useState<"all" | "resolved" | "crt.sh" | "wordlist" | "both">("all");
  const [copied, setCopied]           = useState(false);

  async function handleScan() {
    const domain = inputDomain.trim();
    if (!domain) return;

    setError(""); setResult(null); setScanning(true); setProgress(0);

    let si = 0;
    const tick = setInterval(() => {
      if (si < SCAN_STEPS.length) {
        setProgress(SCAN_STEPS[si][0]);
        setProgressMsg(SCAN_STEPS[si][1]);
        si++;
      }
    }, 1800);

    try {
      const res  = await fetch(`${BACKEND}/find?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      clearInterval(tick);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Complete.");
      await new Promise(r => setTimeout(r, 300));
      setResult(data as FindResult);
    } catch (e: any) {
      clearInterval(tick);
      setError(e.message || "Failed to reach backend. Is the Python server running?");
    } finally {
      setScanning(false);
    }
  }

  const filtered = result?.subdomains.filter(s => {
    if (filter === "resolved") return !!s.ip;
    if (filter === "crt.sh")   return s.source === "crt.sh"   || s.source === "both";
    if (filter === "wordlist") return s.source === "wordlist" || s.source === "both";
    if (filter === "both")     return s.source === "both";
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
    a.download = `subdomains-${result.domain}.json`;
    a.click();
  }

  function exportCSV() {
    if (!result) return;
    const rows = [
      "subdomain,ip,reverse,source",
      ...result.subdomains.map(s =>
        `${s.subdomain},${s.ip ?? ""},${s.reverse ?? ""},${s.source}`
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `subdomains-${result.domain}.csv`;
    a.click();
  }

  function copyList() {
    if (!result) return;
    navigator.clipboard.writeText(result.subdomains.map(s => s.subdomain).join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const crtCount = result
    ? (result.sources["crt.sh"] ?? 0) + (result.sources["both"] ?? 0)
    : 0;
  const wlCount = result
    ? (result.sources["wordlist"] ?? 0) + (result.sources["both"] ?? 0)
    : 0;

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
        <span className="font-mono text-sm text-red-400">Subdomain Finder</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Globe className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">Subdomain Finder</h1>
          <p className="text-sm text-muted-foreground">
            DNS enumeration via certificate transparency logs &amp; wordlist brute-force
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
              value={inputDomain}
              onChange={e => setInputDomain(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="example.com or www.example.com"
              disabled={scanning}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !inputDomain.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
              : <><Search className="h-4 w-4" /> Find</>
            }
          </button>
        </div>

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
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Network className="h-5 w-5 text-red-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.total}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">Total Found</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{result.resolved}</span>
              </div>
              <p className="text-xs font-mono text-green-400">Resolved</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{crtCount}</span>
              </div>
              <p className="text-xs font-mono text-blue-400">From crt.sh</p>
            </div>
            <div className="neon-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-5 w-5 text-orange-400" />
                <span className="font-mono text-2xl font-bold text-foreground">{wlCount}</span>
              </div>
              <p className="text-xs font-mono text-orange-400">From Wordlist</p>
            </div>
          </div>

          {/* Base domain info */}
          <div className="neon-card rounded-lg p-4 flex items-center gap-3 flex-wrap">
            <Globe className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Root Domain</span>
            <span className="font-mono text-sm text-foreground">{result.domain}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono text-sm text-red-400">{result.base_ip}</span>
            {result.input_domain && result.input_domain !== result.domain && (
              <span className="text-[10px] font-mono text-muted-foreground">
                (extracted from <span className="text-foreground">{result.input_domain}</span>)
              </span>
            )}
          </div>

          {/* Results Table */}
          <div className="neon-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-red-400" />
                <h2 className="font-mono text-sm font-semibold text-foreground uppercase tracking-wider">
                  Discovered Subdomains
                </h2>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 p-1 rounded-md bg-muted/40 border border-border flex-wrap">
                <Filter className="h-3 w-3 text-muted-foreground ml-1.5 mr-0.5" />
                {(["all", "resolved", "crt.sh", "wordlist", "both"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                      filter === f
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Export row */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
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
                onClick={copyList}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
              >
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy List"}
              </button>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 mb-1">
              <span className="col-span-5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Subdomain</span>
              <span className="col-span-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">IP Address</span>
              <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Reverse DNS</span>
              <span className="col-span-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Source</span>
            </div>

            {/* Rows */}
            <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground font-mono text-sm">
                  No results for this filter.
                </div>
              ) : (
                filtered.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-md bg-muted/20 border border-border hover:border-red-500/20 transition-colors group"
                  >
                    {/* Subdomain */}
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {s.ip
                        ? <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                        : <XCircle    className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      }
                      <span className="font-mono text-xs text-foreground truncate" title={s.subdomain}>
                        {s.subdomain}
                      </span>
                      <a
                        href={`https://${s.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                      </a>
                    </div>

                    {/* IP */}
                    <div className="col-span-3 min-w-0">
                      {s.ip
                        ? <span className="font-mono text-xs text-red-400 truncate block" title={s.ip}>{s.ip}</span>
                        : <span className="font-mono text-xs text-muted-foreground">—</span>
                      }
                    </div>

                    {/* Reverse DNS */}
                    <div className="col-span-2 min-w-0">
                      {s.reverse
                        ? <span className="font-mono text-xs text-muted-foreground truncate block" title={s.reverse}>{s.reverse}</span>
                        : <span className="font-mono text-xs text-muted-foreground/40">—</span>
                      }
                    </div>

                    {/* Source badge */}
                    <div className="col-span-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${sourceBadge(s.source)}`}>
                        {sourceLabel(s.source)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Idle info */}
      {!scanning && !result && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Discovery Methods
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Certificate Transparency", "Queries crt.sh for all SSL certs ever issued for the domain"],
              ["DNS Wordlist",             "Brute-forces 100+ common subdomain prefixes via live DNS"],
              ["IP Resolution",           "Resolves each discovered subdomain to its IPv4 address"],
              ["Reverse DNS",             "Attempts PTR record lookup for each resolved IP"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Globe className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
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