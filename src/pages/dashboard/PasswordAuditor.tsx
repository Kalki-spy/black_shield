import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle,
         AlertTriangle, XCircle, Loader2, Upload } from "lucide-react";

const BACKEND = "/api";

interface CharClasses { lower:boolean; upper:boolean; digit:boolean; symbol:boolean }
interface Finding { check:string; status:string; severity:string; detail:string }
interface PwdResult {
  length:number; entropy:number; crack_time:string; strength:string;
  score:number; score_pct:number; char_classes:CharClasses;
  findings:Finding[]; suggestions:string[]; hash_sha1_prefix:string; hash_md5:string;
  error?:string;
}
type Tab = "single"|"bulk";

const strengthCls = (s:string) => {
  if (s==="Very Strong") return "text-green-400";
  if (s==="Strong")      return "text-green-400";
  if (s==="Moderate")    return "text-yellow-400";
  if (s==="Weak")        return "text-orange-400";
  return "text-red-400";
};
const strengthBarCls = (pct:number) => {
  if (pct>=85) return "bg-green-500";
  if (pct>=65) return "bg-green-400";
  if (pct>=45) return "bg-yellow-500";
  if (pct>=25) return "bg-orange-500";
  return "bg-red-500";
};
const findingIcon = (s:string) => {
  if (s==="pass") return <CheckCircle   className="h-4 w-4 text-green-400 flex-shrink-0"/>;
  if (s==="warn") return <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0"/>;
  return               <XCircle       className="h-4 w-4 text-red-400 flex-shrink-0"/>;
};

export default function PasswordAuditor() {
  const [tab, setTab]           = useState<Tab>("single");
  const [pwd, setPwd]           = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<PwdResult|null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkRes, setBulkRes]   = useState<any>(null);
  const [error, setError]       = useState("");

  async function analyze() {
    if (!pwd) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/password/analyze`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({password:pwd})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch(e:any) { setError(e.message||"Failed to reach password_auditor_server.py (port 8778)"); }
    finally { setLoading(false); }
  }

  async function analyzeBulk() {
    const passwords = bulkText.split("\n").map(p=>p.trim()).filter(Boolean);
    if (!passwords.length) return;
    setError(""); setBulkRes(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/password/bulk`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({passwords})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setBulkRes(d);
    } catch(e:any) { setError(e.message||"Failed to reach password_auditor_server.py (port 8778)"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span><span className="text-blue-400">Password Auditor</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <KeyRound className="h-6 w-6 text-blue-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Password Auditor</h1>
          <p className="text-sm text-muted-foreground">Entropy analysis · Crack time estimation · Policy compliance · Bulk audit</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-muted/20 border border-border w-fit">
        {(["single","bulk"] as Tab[]).map(t=>(
          <button key={t} onClick={()=>{setTab(t);setError("");setResult(null);setBulkRes(null);}}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-mono text-xs transition-colors ${tab===t?"bg-blue-500/20 border border-blue-500/40 text-blue-400":"text-muted-foreground hover:text-foreground"}`}
          >
            {t==="single"?<><KeyRound className="h-3.5 w-3.5"/> Single</>:<><Upload className="h-3.5 w-3.5"/> Bulk Audit</>}
          </button>
        ))}
      </div>

      {tab==="single" && (
        <div className="neon-card rounded-xl p-6 border border-slate-700/40 bg-slate-900/60 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Password Analysis</p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type={show?"text":"password"} value={pwd}
                onChange={e=>setPwd(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!loading&&analyze()}
                placeholder="Enter password to audit"
                title="Password to analyze"
                disabled={loading}
                className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
              />
              <button onClick={()=>setShow(s=>!s)} title={show?"Hide password":"Show password"}
                aria-label={show?"Hide password":"Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
              </button>
            </div>
            <button onClick={analyze} disabled={loading||!pwd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<KeyRound className="h-4 w-4"/>}
              {loading?"Analyzing...":"Analyze"}
            </button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/60">Passwords are analyzed locally — never stored or transmitted externally</p>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {tab==="bulk" && (
        <div className="neon-card rounded-xl p-6 border border-slate-700/40 bg-slate-900/60 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Bulk Password Audit (one per line, max 50)</p>
          <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)}
            rows={8} placeholder={"password123\nP@ssw0rd!\nadmin\nTr0ub4dor&3"}
            title="Passwords to audit, one per line"
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors resize-none"
          />
          <button onClick={analyzeBulk} disabled={loading||!bulkText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}
            {loading?"Analyzing...":"Audit All"}
          </button>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {/* Single result */}
      {result && tab==="single" && (
        <>
          <div className="neon-card rounded-xl p-5 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-mono text-3xl font-black ${strengthCls(result.strength)}`}>{result.strength}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">Score {result.score_pct}% · {result.entropy} bits entropy · Cracks in: <span className="text-foreground font-bold">{result.crack_time}</span></p>
              </div>
              <div className="flex gap-2">
                {(["lower","upper","digit","symbol"] as const).map(cls=>(
                  <div key={cls} className={`px-2 py-1 rounded font-mono text-[10px] font-bold border ${result.char_classes[cls]?"bg-blue-500/10 text-blue-400 border-blue-500/30":"bg-muted/20 text-muted-foreground/40 border-border"}`}>
                    {cls==="lower"?"a-z":cls==="upper"?"A-Z":cls==="digit"?"0-9":"!@#"}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Strength</span>
                <span className="text-[10px] font-mono text-muted-foreground">{result.score_pct}%</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${strengthBarCls(result.score_pct)}`} style={{width:`${result.score_pct}%`}}/>
              </div>
            </div>
          </div>

          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-4">// Policy Checks</p>
            <div className="space-y-2">
              {result.findings.map((f,i)=>(
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                  {findingIcon(f.status)}
                  <div>
                    <p className="font-mono text-xs font-bold text-foreground">{f.check}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Recommendations</p>
              {result.suggestions.map((s,i)=>(
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-2">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0"/>
                  <p className="text-xs text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bulk results */}
      {bulkRes && tab==="bulk" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["Total Audited", bulkRes.total,  "text-foreground"],
              ["Weak / Medium", bulkRes.weak,   bulkRes.weak>0?"text-red-400":"text-green-400"],
              ["Strong",        bulkRes.strong, "text-green-400"],
            ] as [string,number,string][]).map(([l,v,c])=>(
              <div key={l} className="neon-card rounded-xl p-4 border border-border text-center">
                <div className={`font-mono text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Results</p>
            <div className="space-y-2">
              {bulkRes.results.map((r:any,i:number)=>(
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${strengthBarCls(r.score_pct)}`}/>
                  <span className="font-mono text-xs text-muted-foreground w-40 truncate">{r.password}</span>
                  <span className={`font-mono text-xs font-bold ${strengthCls(r.strength)}`}>{r.strength}</span>
                  <span className="font-mono text-[10px] text-muted-foreground ml-auto">{r.entropy}b · {r.crack_time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}