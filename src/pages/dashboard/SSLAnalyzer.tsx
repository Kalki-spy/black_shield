import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Shield, CheckCircle, AlertTriangle, XCircle,
  ChevronLeft, Loader2, AlertCircle, FileText, Copy, Download,
  ShieldCheck
} from "lucide-react";

const BACKEND = "/api/sslanalyzer";

interface CertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  serialNumber: string;
  signatureAlgorithm: string;
  keyType: string;
  keyBits: number;
  sans: string[];
  fingerprint: string;
  activeProtocol: string;
  activeCipher: string;
}

interface SSLResult {
  category: string;
  item: string;
  status: "secure" | "warning" | "vulnerable";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

const CATEGORIES = ["Certificate", "Protocol Support", "Cipher Suites", "Vulnerabilities", "Features"];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "secure")     return <CheckCircle className="h-4 w-4 text-green-400" />;
  if (status === "warning")    return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  if (status === "vulnerable") return <XCircle className="h-4 w-4 text-red-400" />;
  return <Shield className="h-4 w-4 text-muted-foreground" />;
};

const statusBadge = (status: string) => {
  if (status === "secure")     return "bg-green-500/10 text-green-400 border border-green-500/30";
  if (status === "warning")    return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
  if (status === "vulnerable") return "bg-red-500/10 text-red-400 border border-red-500/30";
  return "bg-muted text-muted-foreground";
};

const severityBadge = (sev: string) => {
  if (sev === "low")      return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
  if (sev === "medium")   return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
  if (sev === "high")     return "bg-orange-500/10 text-orange-400 border border-orange-500/30";
  if (sev === "critical") return "bg-red-500/10 text-red-400 border border-red-500/30";
  return "";
};

export default function SSLAnalyzer() {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const [cert, setCert] = useState<CertInfo | null>(null);
  const [results, setResults] = useState<SSLResult[]>([]);
  const [scannedUrl, setScannedUrl] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Steps timed to match parallel backend (~8-12s total expected)
  const steps: [number, string][] = [
    [10, "Resolving hostname..."],
    [25, "Establishing TLS connection..."],
    [45, "Parsing certificate..."],
    [60, "Testing protocol versions (parallel)..."],
    [75, "Checking cipher suites..."],
    [88, "Analyzing vulnerabilities & features..."],
  ];

  async function handleScan() {
    let url = inputUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    setError(""); setCert(null); setResults([]);
    setShowReport(false); setScanning(true); setProgress(0);

    let si = 0;
    // Tick every 2s — paces well with parallel 5-6s backend
    const tick = setInterval(() => {
      if (si < steps.length) {
        setProgress(steps[si][0]);
        setProgressMsg(steps[si][1]);
        si++;
      }
    }, 2000);

    try {
      const res  = await fetch(`${BACKEND}/analyze?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      clearInterval(tick);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Complete.");
      await new Promise(r => setTimeout(r, 400));
      setCert(data.certificate);
      setResults(data.results);
      setScannedUrl(url);
    } catch (e: any) {
      clearInterval(tick);
      setError(e.message || "Failed to reach backend. Is the Python server running?");
    } finally {
      setScanning(false);
    }
  }

  const summary = results.reduce(
    (a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; },
    { secure: 0, warning: 0, vulnerable: 0 } as Record<string, number>
  );
  const vulns = results.filter(r => r.status === "vulnerable");
  const warns  = results.filter(r => r.status === "warning");

  function exportJSON() {
    const blob = new Blob(
      [JSON.stringify({ url: scannedUrl, certificate: cert, results, timestamp: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ssl-report.json";
    a.click();
  }

  function copyReport() {
    const text = results.map(r => `[${r.status.toUpperCase()}] ${r.item} — ${r.description}`).join("\n");
    navigator.clipboard.writeText(`SSL/TLS Report: ${scannedUrl}\n\n${text}`).then(() => {
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
        <span className="font-mono text-sm text-red-400">TLS/SSL Analyzer</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">TLS/SSL Analyzer</h1>
          <p className="text-sm text-muted-foreground">
            Deep inspection of certificates, protocols, ciphers &amp; vulnerabilities
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground pointer-events-none">
              https://
            </span>
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !scanning && handleScan()}
              placeholder="example.com"
              disabled={scanning}
              className="w-full pl-16 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !inputUrl.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {scanning
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
              : <><Shield className="h-4 w-4" /> Analyze</>
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
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
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

      {/* Certificate */}
      {cert && (
        <div className="neon-card rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-red-400" />
            <h2 className="font-mono text-sm font-semibold text-foreground uppercase tracking-wider">
              Certificate
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {([
              ["Issued To",       cert.subject,                                     undefined],
              ["Issued By",       cert.issuer,                                      undefined],
              ["Valid From",      cert.validFrom,                                   undefined],
              ["Valid Until",     cert.validTo,                                     cert.daysRemaining],
              ["Key",             `${cert.keyBits}-bit ${cert.keyType}`,            undefined],
              ["Protocol/Cipher", `${cert.activeProtocol} · ${cert.activeCipher}`, undefined],
              ["Signature Alg",   cert.signatureAlgorithm,                          undefined],
              ["Serial",          cert.serialNumber,                                undefined],
              ["Fingerprint",     cert.fingerprint,                                 undefined],
            ] as [string, string, number | undefined][]).map(([label, value, extra]) => (
              <div key={label} className="bg-muted/30 rounded-md p-3 border border-border">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  {label}
                </p>
                <p className="text-xs font-mono text-foreground truncate" title={value}>{value}</p>
                {extra !== undefined && (
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    extra > 30 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                  }`}>
                    {extra > 0 ? `${extra}d left` : "EXPIRED"}
                  </span>
                )}
              </div>
            ))}
            {cert.sans?.length > 0 && (
              <div className="bg-muted/30 rounded-md p-3 border border-border col-span-2 md:col-span-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  Subject Alt Names
                </p>
                <p className="text-xs font-mono text-foreground break-all">
                  {cert.sans.join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="neon-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="font-mono text-2xl font-bold text-foreground">{summary.secure}</span>
            </div>
            <p className="text-xs font-mono text-green-400">Secure</p>
          </div>
          <div className="neon-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <span className="font-mono text-2xl font-bold text-foreground">{summary.warning}</span>
            </div>
            <p className="text-xs font-mono text-yellow-400">Warnings</p>
          </div>
          <div className="neon-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="font-mono text-2xl font-bold text-foreground">{summary.vulnerable}</span>
            </div>
            <p className="text-xs font-mono text-red-400">Vulnerable</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="neon-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              <h2 className="font-mono text-sm font-semibold text-foreground uppercase tracking-wider">
                Security Analysis
              </h2>
            </div>
            <button
              onClick={() => {
                setShowReport(true);
                setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 100);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-red-500/40 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> Generate Report
            </button>
          </div>

          <div className="px-3 py-2 rounded-md bg-muted/30 border border-border mb-5">
            <span className="text-[10px] font-mono text-muted-foreground">TARGET </span>
            <span className="text-xs font-mono text-red-400">{scannedUrl}</span>
          </div>

          <div className="space-y-6">
            {CATEGORIES.map(cat => {
              const items = results.filter(r => r.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-2 pb-2 border-b border-border">
                    {cat}
                  </p>
                  <div className="space-y-2">
                    {items.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border border-border hover:border-red-500/20 transition-colors">
                        <div className="mt-0.5"><StatusIcon status={r.status} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-sm font-semibold text-foreground">{r.item}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadge(r.status)}`}>
                              {r.status.toUpperCase()}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${severityBadge(r.severity)}`}>
                              {r.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report */}
      {showReport && results.length > 0 && (
        <div id="report" className="neon-card rounded-lg p-5 space-y-5">
          <div>
            <h2 className="font-mono text-lg font-bold text-foreground">SSL/TLS Security Report</h2>
            <p className="text-xs text-muted-foreground mt-1">Generated {new Date().toLocaleString()}</p>
            <p className="font-mono text-xs text-red-400 mt-0.5">{scannedUrl}</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {([
              ["Tests",      results.length,     "text-foreground"],
              ["Secure",     summary.secure,     "text-green-400"],
              ["Warnings",   summary.warning,    "text-yellow-400"],
              ["Vulnerable", summary.vulnerable, "text-red-400"],
            ] as [string, number, string][]).map(([label, val, cls]) => (
              <div key={label} className="bg-muted/30 rounded-md p-3 border border-border text-center">
                <div className={`font-mono text-2xl font-bold ${cls}`}>{val}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>

          {vulns.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Critical Issues
              </p>
              {vulns.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-red-500/5 border border-red-500/20 mb-2">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-mono text-sm font-semibold text-foreground">{r.item} </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${severityBadge(r.severity)}`}>
                      {r.severity.toUpperCase()}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {warns.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Warnings
              </p>
              {warns.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">{r.item}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Recommendations
            </p>
            {vulns.length > 0 && (
              <div className="flex gap-3 p-3 rounded-md bg-red-500/5 border border-red-500/20 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-mono text-xs font-bold text-red-400 mb-0.5">Critical Priority</p>
                  <p className="text-xs text-muted-foreground">
                    Disable vulnerable protocols and weak ciphers immediately to prevent exploitation.
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20 mb-2">
              <Shield className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-xs font-bold text-yellow-400 mb-0.5">High Priority</p>
                <p className="text-xs text-muted-foreground">
                  Enforce TLS 1.2+ minimum. Prefer TLS 1.3 with AEAD cipher suites and perfect forward secrecy.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
              <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-xs font-bold text-blue-400 mb-0.5">Best Practices</p>
                <p className="text-xs text-muted-foreground">
                  Enable HSTS, configure OCSP stapling, automate certificate renewal, and schedule quarterly TLS audits.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
            <button
              onClick={copyReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy Report"}
            </button>
          </div>
        </div>
      )}

      {/* Idle info */}
      {!scanning && results.length === 0 && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            What We Check
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Certificate",     "Chain validity, expiry, key length, SANs"],
              ["Protocols",       "Live TLS 1.0 / 1.1 / 1.2 / 1.3 testing"],
              ["Cipher Suites",   "AEAD, forward secrecy, weak ciphers"],
              ["Vulnerabilities", "BEAST, POODLE, SWEET32, CRIME"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <Lock className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
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