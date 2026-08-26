import { useState } from "react";
import { Link } from "react-router-dom";
import { ScanLine, Server, AlertTriangle, AlertCircle, Loader2, ChevronRight } from "lucide-react";

const BACKEND = "/api";

interface PortResult {
  port: number; open: boolean; service: string;
  latency: number | null; risk: "low" | "medium" | "high";
}

export default function PortScanner() {
  const [host,        setHost]        = useState("");
  const [portsRaw,    setPortsRaw]    = useState("");
  const [scanning,    setScanning]    = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState("");
  const [results,     setResults]     = useState<PortResult[]>([]);
  const [scannedHost, setScannedHost] = useState("");

  async function handleScan() {
    const h = host.trim();
    if (!h) return;
    setError(""); setResults([]); setScanning(true); setProgress(0);
    let p = 0;
    const tick = setInterval(() => { p = Math.min(p + 8, 88); setProgress(p); }, 800);
    try {
      const r = await fetch(`${BACKEND}/network/portscan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: h, ports: portsRaw.trim() || undefined }),
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — is ddos_server.py running? Try restarting npm run dev");
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      await new Promise(r2 => setTimeout(r2, 300));
      setResults(data.ports ?? []);
      setScannedHost(h);
    } catch (e: any) {
      setError(e.message || "Scan failed — is ddos_server.py running on port 8775?");
    } finally {
      clearInterval(tick); setScanning(false);
    }
  }

  const openPorts   = results.filter(p => p.open);
  const closedPorts = results.filter(p => !p.open);
  const riskyOpen   = openPorts.filter(p => p.risk === "high");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span>
        <span className="text-rose-400/80">Port Scanner</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-700/30 flex items-center justify-center flex-shrink-0">
          <ScanLine className="h-6 w-6 text-rose-400/80" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Port Scanner</h1>
          <p className="text-sm text-muted-foreground">Parallel TCP probing · Service fingerprinting · Risk scoring</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 space-y-4">
        <p className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest">// Target Configuration</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="text" value={host}
              onChange={e => setHost(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="Host or IP address"
              title="Target host or IP address" disabled={scanning}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-background border border-slate-700/50 font-mono text-sm text-foreground focus:outline-none focus:border-rose-700/50 transition-colors"
            />
          </div>
          <input type="text" value={portsRaw}
            onChange={e => setPortsRaw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
            placeholder="Ports: 80,443 or 1-1024 (blank = common)"
            title="Port range or list" disabled={scanning}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-slate-700/50 font-mono text-sm text-foreground focus:outline-none focus:border-rose-700/50 transition-colors"
          />
        </div>

        <button onClick={handleScan} disabled={scanning || !host.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-700/30 text-rose-400/80 font-mono text-sm font-semibold hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          {scanning ? "Scanning..." : "Scan Ports"}
        </button>

        {scanning && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-mono text-xs text-muted-foreground">Probing ports...</span>
              <span className="font-mono text-xs text-rose-400/70">{progress}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600/60 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-mono text-rose-400/80">{error}</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["Open Ports",    openPorts.length,   "text-slate-100"],
              ["Risky Open",    riskyOpen.length,   riskyOpen.length > 0 ? "text-rose-400/80" : "text-slate-400"],
              ["Closed",        closedPorts.length, "text-slate-500"],
            ] as [string, number, string][]).map(([label, val, cls]) => (
              <div key={label} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4 text-center">
                <div className={`font-mono text-3xl font-bold ${cls}`}>{val}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest">// Results</p>
              <span className="font-mono text-xs text-slate-500">TARGET <span className="text-slate-300">{scannedHost}</span></span>
            </div>
            <div className="space-y-2">
              {openPorts.map(p => (
                <div key={p.port} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    p.risk === "high" ? "bg-rose-500" : p.risk === "medium" ? "bg-amber-500" : "bg-slate-400"
                  }`} />
                  <span className="font-mono text-sm font-bold text-slate-100 w-16">:{p.port}</span>
                  <span className="font-mono text-xs text-slate-500 w-28">{p.service}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                    p.risk === "high"   ? "bg-rose-500/10 text-rose-400/80 border-rose-700/30" :
                    p.risk === "medium" ? "bg-amber-500/10 text-amber-400/80 border-amber-700/30" :
                    "bg-slate-700/30 text-slate-400 border-slate-600/30"
                  }`}>
                    {p.risk === "high" ? "RISKY" : p.risk === "medium" ? "CAUTION" : "OPEN"}
                  </span>
                  {p.latency != null && (
                    <span className="font-mono text-xs text-slate-600 ml-auto">{p.latency.toFixed(1)} ms</span>
                  )}
                  {p.risk === "high" && <AlertTriangle className="h-3.5 w-3.5 text-rose-400/60 flex-shrink-0" />}
                </div>
              ))}
              {closedPorts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-[10px] font-mono text-slate-600 mb-2">{closedPorts.length} closed / filtered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {closedPorts.map(p => (
                      <span key={p.port} className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-800/60 border border-slate-700/40 text-slate-600">:{p.port}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
