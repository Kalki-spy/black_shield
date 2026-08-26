import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, ChevronLeft, Loader2, Search, XCircle,
  CheckCircle, Copy, Download, KeyRound, Hash,
  Settings, Shield, AlertTriangle
} from "lucide-react";

const BACKEND = "/api/hashcat";

type HashMode = "wordlist" | "bruteforce" | "both";
type HashType = "auto" | "md5" | "sha1" | "sha224" | "sha256" | "sha384" | "sha512";

interface CrackResult {
  hash:           string;
  hash_type:      string;
  detected_types: string[];
  mode:           string;
  cracked:        boolean;
  plaintext:      string | null;
  attempts:       number;
  time_seconds:   number;
  method:         string;
  note?:          string;
}

const CRACK_STEPS: [number, string][] = [
  [10, "Loading hash..."],
  [25, "Detecting hash type..."],
  [40, "Running wordlist attack..."],
  [65, "Trying common mutations..."],
  [82, "Running brute-force..."],
  [94, "Finalising..."],
];

const SAMPLE_HASHES: { label: string; hash: string; type: HashType; plain: string }[] = [
  { label: "MD5 — 'password'",   hash: "5f4dcc3b5aa765d61d8327deb882cf99", type: "md5",    plain: "password" },
  { label: "MD5 — 'admin'",      hash: "21232f297a57a5a743894a0e4a801fc3", type: "md5",    plain: "admin" },
  { label: "SHA1 — 'hello'",     hash: "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", type: "sha1",  plain: "hello" },
  { label: "SHA256 — '123456'",  hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", type: "sha256", plain: "123456" },
];

export default function HashcatTool() {
  const navigate = useNavigate();

  const [hashInput, setHashInput]   = useState("");
  const [hashType, setHashType]     = useState<HashType>("auto");
  const [mode, setMode]             = useState<HashMode>("both");
  const [wordlistRaw, setWordlistRaw] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const [cracking, setCracking]     = useState(false);
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]           = useState("");
  const [result, setResult]         = useState<CrackResult | null>(null);
  const [copied, setCopied]         = useState(false);

  async function handleCrack() {
    const hash = hashInput.trim();
    if (!hash) return;
    setError(""); setResult(null); setCracking(true); setProgress(0);

    let si = 0;
    const tick = setInterval(() => {
      if (si < CRACK_STEPS.length) {
        setProgress(CRACK_STEPS[si][0]);
        setProgressMsg(CRACK_STEPS[si][1]);
        si++;
      }
    }, 1200);

    try {
      const body: any = { hash, hash_type: hashType, mode };
      if (wordlistRaw.trim()) {
        body.wordlist = wordlistRaw.split("\n").map(w => w.trim()).filter(Boolean);
      }
      const res  = await fetch(`${BACKEND}/crack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      clearInterval(tick);
      if (data.error) throw new Error(data.error);
      setProgress(100);
      setProgressMsg("Complete.");
      await new Promise(r => setTimeout(r, 200));
      setResult(data as CrackResult);
    } catch (e: any) {
      clearInterval(tick);
      setError(e.message || "Failed to reach backend. Is hashcat_server.py running?");
    } finally {
      setCracking(false);
    }
  }

  function loadSample(s: typeof SAMPLE_HASHES[0]) {
    setHashInput(s.hash);
    setHashType(s.type);
    setResult(null);
    setError("");
  }

  function copyResult() {
    if (!result?.plaintext) return;
    navigator.clipboard.writeText(result.plaintext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function exportJSON() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hashcat-result-${Date.now()}.json`;
    a.click();
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard/tools")}
          className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Tools
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-sm text-red-400">Hashcat</span>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground">Hashcat</h1>
          <p className="text-sm text-muted-foreground">
            Password hash cracking via wordlist, mutation, and brute-force attacks
          </p>
        </div>
      </div>

      {/* Sample hashes */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest self-center">Samples:</span>
        {SAMPLE_HASHES.map(s => (
          <button
            key={s.hash}
            onClick={() => loadSample(s)}
            className="px-2.5 py-1 rounded-md bg-muted border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-red-500/30 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input Card */}
      <div className="neon-card rounded-lg p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={hashInput}
              onChange={e => setHashInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !cracking && handleCrack()}
              placeholder="Paste hash here — e.g. 5f4dcc3b5aa765d61d8327deb882cf99"
              disabled={cracking}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500/50 disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => setShowOptions(v => !v)}
            title="Toggle options"
            aria-label="Toggle options"
            className={`px-3 py-2.5 rounded-md border font-mono text-xs transition-colors ${
              showOptions
                ? "bg-red-500/10 border-red-500/30 text-yellow-400"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleCrack}
            disabled={cracking || !hashInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cracking
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Cracking...</>
              : <><Search className="h-4 w-4" /> Crack</>
            }
          </button>
        </div>

        {/* Options */}
        {showOptions && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
            {/* Hash Type */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Hash Type
              </label>
              <div className="flex flex-wrap gap-1">
                {(["auto", "md5", "sha1", "sha256", "sha512"] as HashType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setHashType(t)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                      hashType === t
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Attack Mode */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Attack Mode
              </label>
              <div className="flex gap-1">
                {(["wordlist", "bruteforce", "both"] as HashMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold border transition-colors ${
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

            {/* Custom Wordlist */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Custom Wordlist (one per line — optional)
              </label>
              <textarea
                value={wordlistRaw}
                onChange={e => setWordlistRaw(e.target.value)}
                placeholder={"mypassword\nletmein\nhunter2"}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none"
              />
            </div>
          </div>
        )}

        {/* Progress */}
        {cracking && (
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

      {/* Result */}
      {result && (
        <div className={`neon-card rounded-lg p-6 border-2 ${
          result.cracked ? "border-green-500/40" : "border-red-500/30"
        }`}>
          {/* Status banner */}
          <div className="flex items-center gap-3 mb-6">
            {result.cracked
              ? <CheckCircle className="h-8 w-8 text-green-400" />
              : <XCircle     className="h-8 w-8 text-red-400" />
            }
            <div>
              <p className={`text-xl font-bold font-mono ${result.cracked ? "text-green-400" : "text-red-400"}`}>
                {result.cracked ? "HASH CRACKED" : "NOT CRACKED"}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {result.method} · {result.attempts.toLocaleString("en-US")} attempts · {result.time_seconds}s
              </p>
            </div>
            {result.cracked && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-xs hover:bg-green-500/20 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs hover:bg-blue-500/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Hash</p>
                <p className="font-mono text-xs text-foreground break-all">{result.hash}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Algorithm</p>
                <p className="font-mono text-sm text-red-400 uppercase">{result.hash_type}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Detected Types</p>
                <div className="flex flex-wrap gap-1">
                  {result.detected_types.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
                      {t.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {result.cracked && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-[10px] font-mono text-green-400/70 uppercase tracking-widest mb-1">Plaintext Password</p>
                  <p className="font-mono text-2xl font-bold text-green-400">{result.plaintext}</p>
                </div>
              )}
              {!result.cracked && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest mb-1">Result</p>
                  <p className="font-mono text-sm text-red-400">
                    Hash not found in wordlist or brute-force range.
                    Try adding a custom wordlist or use a dedicated tool like real Hashcat with a larger wordlist.
                  </p>
                  {result.note && (
                    <p className="font-mono text-xs text-muted-foreground mt-2">{result.note}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-md bg-muted/20 border border-border text-center">
                  <p className="font-mono text-lg font-bold text-foreground">{result.attempts.toLocaleString("en-US")}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">Attempts</p>
                </div>
                <div className="p-3 rounded-md bg-muted/20 border border-border text-center">
                  <p className="font-mono text-lg font-bold text-foreground">{result.time_seconds}s</p>
                  <p className="text-[10px] font-mono text-muted-foreground">Time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idle info */}
      {!cracking && !result && !error && (
        <div className="neon-card rounded-lg p-5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Supported Attacks</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["Wordlist Attack",    "Tests thousands of common passwords and known weak credentials"],
              ["Mutation Engine",   "Applies capitalization, number suffixes, and symbol variants"],
              ["Brute-Force",       "Exhaustive character-set search for short passwords (≤4 chars)"],
              ["Auto-Detection",    "Identifies hash type by length — MD5, SHA1, SHA256, SHA512"],
            ] as [string, string][]).map(([title, desc]) => (
              <div key={title} className="flex gap-2 p-3 rounded-md bg-muted/20 border border-border">
                <KeyRound className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
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