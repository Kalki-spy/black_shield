import { useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Search, AlertCircle, Loader2, Plus, X, Download } from "lucide-react";

const BACKEND = "/api";

interface CVEEntry {
  cve:string; software:string; cvss:number; severity:string;
  desc:string; vector:string; patch:string; affects_version?:boolean; note?:string;
}
interface ScanResult {
  software:string; version:string|null;
  cves:CVEEntry[]; risk:string;
  summary:{ total:number; critical:number; high:number; medium:number; max_cvss:number };
  scanned_at:string;
}
type Tab = "single"|"bulk";

const riskCls = (r:string) => {
  if (r==="critical") return "text-red-400 border-red-500/40 bg-red-500/10";
  if (r==="high")     return "text-orange-400 border-orange-500/40 bg-orange-500/10";
  if (r==="medium")   return "text-yellow-400 border-yellow-500/40 bg-yellow-500/10";
  if (r==="low")      return "text-green-400 border-green-500/40 bg-green-500/10";
  return "text-muted-foreground border-border bg-muted/20";
};
const sevBadge = (s:string) => {
  if (s==="critical") return "bg-red-500/10 text-red-400 border border-red-500/30";
  if (s==="high")     return "bg-orange-500/10 text-orange-400 border border-orange-500/30";
  if (s==="medium")   return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
  return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
};
const cvssCls = (c:number) => {
  if (c>=9) return "text-red-400"; if (c>=7) return "text-orange-400";
  if (c>=4) return "text-yellow-400"; return "text-green-400";
};

export default function CVEScanner() {
  const [tab, setTab]       = useState<Tab>("single");
  const [sw, setSw]         = useState("");
  const [ver, setVer]       = useState("");
  const [loading, setLoading]= useState(false);
  const [result, setResult] = useState<ScanResult|null>(null);
  const [error, setError]   = useState("");
  const [targets, setTargets]= useState([{software:"",version:""}]);
  const [bulkRes, setBulkRes]= useState<ScanResult[]|null>(null);

  async function scan() {
    if (!sw.trim()) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/cve/scan`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({software:sw.trim(), version:ver.trim()||undefined})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch(e:any) { setError(e.message||"Failed to reach cve_scanner_server.py (port 8779)"); }
    finally { setLoading(false); }
  }

  async function scanBulk() {
    const valid = targets.filter(t=>t.software.trim());
    if (!valid.length) return;
    setError(""); setBulkRes(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/cve/bulk`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({targets:valid})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setBulkRes(d.results);
    } catch(e:any) { setError(e.message||"Failed to reach cve_scanner_server.py (port 8779)"); }
    finally { setLoading(false); }
  }

  function exportResult() {
    const data = tab==="single" ? result : bulkRes;
    if (!data) return;
    const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(b);
    a.download=`cve-scan-${Date.now()}.json`; a.click();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span><span className="text-blue-400">CVE Scanner</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Bug className="h-6 w-6 text-blue-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">CVE Vulnerability Scanner</h1>
          <p className="text-sm text-muted-foreground">Known CVE lookup · CVSS scoring · Patch guidance · Bulk software audit</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-muted/20 border border-border w-fit">
        {(["single","bulk"] as Tab[]).map(t=>(
          <button key={t} onClick={()=>{setTab(t);setError("");setResult(null);setBulkRes(null);}}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-mono text-xs transition-colors ${tab===t?"bg-blue-500/20 border border-blue-500/40 text-blue-400":"text-muted-foreground hover:text-foreground"}`}
          >
            {t==="single"?<><Search className="h-3.5 w-3.5"/> Single Scan</>:<><Bug className="h-3.5 w-3.5"/> Bulk Scan</>}
          </button>
        ))}
      </div>

      {tab==="single" && (
        <div className="neon-card rounded-xl p-6 border border-slate-700/40 bg-slate-900/60 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Software Target</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
              <input value={sw} onChange={e=>setSw(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!loading&&scan()}
                placeholder="Software name (e.g. apache, log4j, openssl)"
                title="Software to scan for CVEs" disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
              />
            </div>
            <input value={ver} onChange={e=>setVer(e.target.value)}
              placeholder="Version (optional)" title="Software version" disabled={loading}
              className="w-36 px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
            <button onClick={scan} disabled={loading||!sw.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}
              {loading?"Scanning...":"Scan"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["apache","log4j","openssl","nginx","wordpress","mysql","vsftpd","redis"].map(s=>(
              <button key={s} onClick={()=>setSw(s)}
                className="px-2 py-0.5 rounded font-mono text-[10px] bg-muted/30 border border-border text-muted-foreground hover:text-blue-400 hover:border-blue-500/30 transition-colors"
              >{s}</button>
            ))}
          </div>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {tab==="bulk" && (
        <div className="neon-card rounded-xl p-6 border border-slate-700/40 bg-slate-900/60 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Bulk Software Audit</p>
          <div className="space-y-2">
            {targets.map((t,i)=>(
              <div key={i} className="flex gap-2">
                <input value={t.software} onChange={e=>{const n=[...targets];n[i]={...n[i],software:e.target.value};setTargets(n);}}
                  placeholder="Software name" title={`Software ${i+1}`} disabled={loading}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
                <input value={t.version} onChange={e=>{const n=[...targets];n[i]={...n[i],version:e.target.value};setTargets(n);}}
                  placeholder="Version" title={`Version ${i+1}`} disabled={loading}
                  className="w-28 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                />
                {targets.length>1 && (
                  <button onClick={()=>setTargets(targets.filter((_,j)=>j!==i))}
                    title="Remove target" aria-label="Remove target"
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <X className="h-4 w-4"/>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setTargets([...targets,{software:"",version:""}])} disabled={targets.length>=20}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors disabled:opacity-50"
            ><Plus className="h-3.5 w-3.5"/> Add Target</button>
            <button onClick={scanBulk} disabled={loading||!targets.some(t=>t.software.trim())}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Bug className="h-4 w-4"/>}
              {loading?"Scanning...":"Scan All"}
            </button>
            {bulkRes && <button onClick={exportResult} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors ml-auto"><Download className="h-3.5 w-3.5"/> Export</button>}
          </div>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {/* Single result */}
      {result && tab==="single" && (
        <>
          <div className={`neon-card rounded-xl p-5 border-2 ${riskCls(result.risk)}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-2xl font-black uppercase ${riskCls(result.risk).split(" ")[0]}`}>{result.risk} Risk</span>
                  <span className="font-mono text-sm text-muted-foreground">{result.software} {result.version||""}</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-1">{result.summary.total} CVEs · Max CVSS {result.summary.max_cvss} · {result.summary.critical} critical · {result.summary.high} high</p>
              </div>
              <button onClick={exportResult} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors">
                <Download className="h-3.5 w-3.5"/> Export
              </button>
            </div>
          </div>

          {result.cves.length > 0 ? (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-4">// CVE Findings</p>
              <div className="space-y-3">
                {result.cves.map((c,i)=>(
                  <div key={i} className={`p-4 rounded-xl border ${c.affects_version===false?"opacity-50 border-border bg-muted/10":c.severity==="critical"?"bg-red-500/5 border-red-500/20":c.severity==="high"?"bg-orange-500/5 border-orange-500/15":"bg-muted/20 border-border"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-foreground">{c.cve}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${sevBadge(c.severity)}`}>{c.severity.toUpperCase()}</span>
                        {c.affects_version===false && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border border-border bg-muted/20">VER N/A</span>}
                      </div>
                      <span className={`font-mono text-lg font-black flex-shrink-0 ${cvssCls(c.cvss)}`}>{c.cvss}</span>
                    </div>
                    <p className="text-xs text-foreground mb-2">{c.desc}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mb-1">Vector: {c.vector}</p>
                    <p className="text-[10px] text-blue-400">↳ Patch: {c.patch}</p>
                    {c.note && <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{c.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="neon-card rounded-xl p-5 flex items-center gap-3">
              <Bug className="h-5 w-5 text-green-400"/>
              <p className="font-mono text-sm text-green-400">No CVEs found in database for "{result.software}"</p>
            </div>
          )}
        </>
      )}

      {/* Bulk results */}
      {bulkRes && tab==="bulk" && (
        <div className="space-y-3">
          {bulkRes.map((r,i)=>(
            <div key={i} className={`neon-card rounded-xl p-4 border ${r.risk==="critical"?"border-red-500/30":r.risk==="high"?"border-orange-500/30":r.risk==="low"||r.risk==="unknown"?"border-green-500/20":"border-yellow-500/20"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold text-foreground">{r.software} {r.version||""}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${riskCls(r.risk)}`}>{r.risk.toUpperCase()}</span>
                <span className="font-mono text-xs text-muted-foreground ml-auto">{r.summary.total} CVEs · Max {r.summary.max_cvss} CVSS</span>
              </div>
              {r.cves.slice(0,2).map((c,j)=>(
                <div key={j} className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{c.cve}</span>
                  <span className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold ${sevBadge(c.severity)}`}>{c.severity.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{c.desc}</span>
                </div>
              ))}
              {r.cves.length>2 && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">+{r.cves.length-2} more CVEs</p>}
            </div>
          ))}
        </div>
      )}

      {!loading && !result && !bulkRes && !error && (
        <div className="neon-card rounded-xl p-6">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">// Supported Software</p>
          <div className="flex flex-wrap gap-2">
            {["Apache","OpenSSL","Nginx","WordPress","MySQL","PHP","OpenSSH","Log4j","Samba","vsftpd","Tomcat","Elasticsearch","Redis"].map(s=>(
              <span key={s} className="px-2.5 py-1 rounded-lg font-mono text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}