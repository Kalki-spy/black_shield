import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Server, AlertTriangle, CheckCircle, XCircle,
         Loader2, AlertCircle, Code } from "lucide-react";

const BACKEND = "/api";

interface PortProbe { port:number; state:string; latency_ms:number|null; service:string }
interface FwFinding { port:number; service:string; severity:string; issue:string; recommendation:string }
interface TestResult {
  host:string; timestamp:string;
  results:PortProbe[]; findings:FwFinding[];
  summary:{ open:number; closed:number; filtered:number; critical_findings:number };
}
interface RuleIssue { line:number; severity:string; issue:string }
interface ParsedRule { line:number; raw:string; action:string|null; port:number|null; issue:string|null }
interface AnalyzeResult {
  parsed:ParsedRule[]; issues:RuleIssue[];
  total_rules:number; accept_rules:number; drop_rules:number;
}
type Tab = "probe"|"rules";

const stateCls = (s:string) => {
  if (s==="open")     return "text-red-400 border-red-500/30 bg-red-500/10";
  if (s==="filtered") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  return "text-green-400 border-green-500/30 bg-green-500/10";
};

export default function FirewallTester() {
  const [tab, setTab]         = useState<Tab>("probe");
  const [host, setHost]       = useState("");
  const [ports, setPorts]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<TestResult|null>(null);
  const [rules, setRules]     = useState("");
  const [analyzed, setAnalyzed] = useState<AnalyzeResult|null>(null);
  const [error, setError]     = useState("");

  async function runProbe() {
    const h = host.trim(); if (!h) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/firewall/test`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({host:h, ports: ports.trim()||undefined})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch(e:any) { setError(e.message||"Failed to reach firewall_server.py (port 8777)"); }
    finally { setLoading(false); }
  }

  async function runAnalyze() {
    if (!rules.trim()) return;
    setError(""); setAnalyzed(null); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/firewall/analyze`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({rules})
      });
      const text = await r.text();
      if (!text) throw new Error("Server returned empty response — make sure all backend servers are running (npm run dev)");
      const d = JSON.parse(text);
      if (d.error) throw new Error(d.error);
      setAnalyzed(d);
    } catch(e:any) { setError(e.message||"Failed to reach firewall_server.py (port 8777)"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
        <Link to="/dashboard/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <span>/</span><span className="text-blue-400">Firewall Tester</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-blue-400"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Firewall Rule Tester</h1>
          <p className="text-sm text-muted-foreground">Live port state probing · Misconfiguration detection · Rule auditing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/20 border border-border w-fit">
        {(["probe","rules"] as Tab[]).map(t=>(
          <button key={t} onClick={()=>{setTab(t);setError("");}}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-mono text-xs transition-colors ${
              tab===t ? "bg-blue-500/20 border border-blue-500/40 text-blue-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t==="probe" ? <><Server className="h-3.5 w-3.5"/> Port Probe</> : <><Code className="h-3.5 w-3.5"/> Rule Audit</>}
          </button>
        ))}
      </div>

      {tab==="probe" && (
        <div className="neon-card rounded-xl p-6 border border-blue-500/20 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Port Probe Configuration</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
              <input value={host} onChange={e=>setHost(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!loading&&runProbe()}
                placeholder="Host or IP" title="Target host" disabled={loading}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
              />
            </div>
            <input value={ports} onChange={e=>setPorts(e.target.value)}
              placeholder="Ports: 80,443 or 1-1024 (blank = all common)"
              title="Port range or list" disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
            />
          </div>
          <button onClick={runProbe} disabled={loading||!host.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Shield className="h-4 w-4"/>}
            {loading?"Probing...":"Run Probe"}
          </button>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {tab==="rules" && (
        <div className="neon-card rounded-xl p-6 border border-blue-500/20 space-y-4">
          <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">// Paste iptables / ufw Rules</p>
          <textarea value={rules} onChange={e=>setRules(e.target.value)}
            rows={8} placeholder={`# Paste your iptables or ufw rules here\n-A INPUT -p tcp --dport 22 -j ACCEPT\n-A INPUT -p tcp --dport 80 -j ACCEPT\n-A INPUT -p tcp --dport 3389 -j ACCEPT\n-A INPUT -j DROP`}
            title="Firewall rules to audit"
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors resize-none"
          />
          <button onClick={runAnalyze} disabled={loading||!rules.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-sm font-semibold hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Code className="h-4 w-4"/>}
            {loading?"Analyzing...":"Audit Rules"}
          </button>
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"><AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0"/><p className="text-xs font-mono text-red-400">{error}</p></div>}
        </div>
      )}

      {/* Probe Results */}
      {result && tab==="probe" && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {([
              ["Open",     result.summary.open,             "text-red-400"],
              ["Closed",   result.summary.closed,           "text-green-400"],
              ["Filtered", result.summary.filtered,         "text-yellow-400"],
              ["Issues",   result.summary.critical_findings,result.summary.critical_findings>0?"text-red-400":"text-green-400"],
            ] as [string,number,string][]).map(([l,v,c])=>(
              <div key={l} className="neon-card rounded-xl p-4 border border-border text-center">
                <div className={`font-mono text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>

          {result.findings.length > 0 && (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Misconfigurations Found</p>
              <div className="space-y-2">
                {result.findings.map((f,i)=>(
                  <div key={i} className={`p-3 rounded-lg border ${f.severity==="critical"?"bg-red-500/5 border-red-500/25":"bg-yellow-500/5 border-yellow-500/20"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {f.severity==="critical"?<XCircle className="h-4 w-4 text-red-400"/>:<AlertTriangle className="h-4 w-4 text-yellow-400"/>}
                      <span className="font-mono text-sm font-bold text-foreground">:{f.port} {f.service}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ml-auto ${f.severity==="critical"?"bg-red-500/10 text-red-400 border border-red-500/30":"bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"}`}>{f.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.issue}</p>
                    <p className="text-[10px] font-mono text-blue-400 mt-1">↳ {f.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Port States — {result.host}</p>
            <div className="space-y-1.5">
              {result.results.map(p=>(
                <div key={p.port} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border hover:border-blue-500/20 transition-colors">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${p.state==="open"?"bg-red-500":p.state==="filtered"?"bg-yellow-500":"bg-green-500"}`}/>
                  <span className="font-mono text-sm font-bold text-foreground w-14">:{p.port}</span>
                  <span className="font-mono text-xs text-muted-foreground w-28">{p.service}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${stateCls(p.state)}`}>{p.state.toUpperCase()}</span>
                  {p.latency_ms!=null && <span className="font-mono text-xs text-muted-foreground ml-auto">{p.latency_ms} ms</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Rule Audit Results */}
      {analyzed && tab==="rules" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["Total Rules",   analyzed.total_rules,  "text-foreground"],
              ["ACCEPT Rules",  analyzed.accept_rules, "text-yellow-400"],
              ["DROP / REJECT", analyzed.drop_rules,   "text-green-400"],
            ] as [string,number,string][]).map(([l,v,c])=>(
              <div key={l} className="neon-card rounded-xl p-4 border border-border text-center">
                <div className={`font-mono text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>

          {analyzed.issues.length > 0 ? (
            <div className="neon-card rounded-xl p-5">
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Rule Issues ({analyzed.issues.length})</p>
              {analyzed.issues.map((iss,i)=>(
                <div key={i} className={`p-3 rounded-lg border mb-2 ${iss.severity==="critical"?"bg-red-500/5 border-red-500/25":"bg-orange-500/5 border-orange-500/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className={`h-4 w-4 ${iss.severity==="critical"?"text-red-400":"text-orange-400"}`}/>
                    <span className="font-mono text-xs text-muted-foreground">Line {iss.line}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ml-auto ${iss.severity==="critical"?"bg-red-500/10 text-red-400 border border-red-500/30":"bg-orange-500/10 text-orange-400 border border-orange-500/30"}`}>{iss.severity.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-red-400 font-mono">{iss.issue}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="neon-card rounded-xl p-5 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400"/>
              <p className="font-mono text-sm text-green-400">No obvious rule misconfigurations detected</p>
            </div>
          )}

          <div className="neon-card rounded-xl p-5">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">// Parsed Rules</p>
            <div className="space-y-1">
              {analyzed.parsed.map(r=>(
                <div key={r.line} className={`flex items-center gap-3 p-2 rounded-lg font-mono text-xs border ${r.issue?"bg-red-500/5 border-red-500/20":"bg-muted/10 border-border/50"}`}>
                  <span className="text-muted-foreground/60 w-8 text-right">{r.line}</span>
                  {r.action && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.action==="ACCEPT"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30":"bg-green-500/10 text-green-400 border-green-500/30"}`}>{r.action}</span>}
                  {r.port && <span className="text-blue-400">:{r.port}</span>}
                  <span className="text-muted-foreground truncate flex-1">{r.raw}</span>
                  {r.issue && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0"/>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}