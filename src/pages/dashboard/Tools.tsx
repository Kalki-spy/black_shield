import {
  Search, Terminal, FolderSearch, Globe, ShieldCheck, Database,
  Lock, Wifi, Code, Crosshair, Zap, Network, Shield,
  KeyRound, Bug, ChevronRight, Activity, Eye, Target, Swords,
  Radio, FlaskConical, Radar, ScanLine, BarChart3, FileSearch,
  BookOpen, Rocket, Star, Lightbulb, Map, HelpCircle,
  Server, Link, Hash, Binary, Layers, Award
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeamMode } from "@/contexts/TeamModeContext";

type TeamMode = "red" | "blue" | "explorer";
type Difficulty = "beginner" | "intermediate" | "advanced";

interface Tool {
  name: string;
  desc: string;
  icon: any;
  category: string;
  mode: TeamMode;
  url?: string;
  route?: string;
  status?: "live" | "external" | "beta";
  danger?: boolean;
  difficulty?: Difficulty;
  tip?: string;
  xp?: number;
}

const tools: Tool[] = [
  // 🔴 RED TEAM
  { name: "DDoS Simulator",    desc: "Simulate SYN, UDP, HTTP, ICMP, botnet & amplification floods with real-time traffic detection", icon: Zap,         category: "Network",     mode: "red", route: "/dashboard/tools/ddos-simulator",   status: "live", danger: true },
  { name: "Port Scanner",      desc: "Parallel TCP probing, service fingerprinting, risk scoring and custom port ranges",             icon: ScanLine,    category: "Recon",       mode: "red", route: "/dashboard/tools/port-scanner",      status: "live" },
  { name: "Metasploit",        desc: "Port scanning, service fingerprinting, and CVE vulnerability matching",                         icon: Swords,      category: "Exploit",     mode: "red", route: "/dashboard/tools/metasploit",         status: "live", danger: true },
  { name: "SQLMap",            desc: "Automatic SQL injection detection and database enumeration",                                    icon: Database,    category: "Injection",   mode: "red", route: "/dashboard/tools/sqli-scanner",       status: "live", danger: true },
  { name: "Directory Scanner", desc: "Fast brute-force enumeration of hidden directories and files on web servers",                   icon: FolderSearch,category: "Enumeration", mode: "red", route: "/dashboard/tools/directory-scanner",  status: "live" },
  { name: "Hashcat",           desc: "Password hash cracking via wordlist, mutation rules, and brute-force attacks",                  icon: FlaskConical,category: "Crypto",      mode: "red", route: "/dashboard/tools/hashcat",            status: "live" },
  { name: "TLS/SSL Analyzer",  desc: "Deep inspection of TLS configs, certificate validity, cipher suites and known vulns",           icon: Shield,      category: "Recon",       mode: "red", route: "/dashboard/tools/ssl-analyzer",       status: "live" },
  { name: "Subdomain Finder",  desc: "Discover hidden subdomains and map the full attack surface using advanced enumeration",          icon: Radar,       category: "Recon",       mode: "red", route: "/dashboard/tools/subdomain-finder",   status: "live" },
  { name: "Sniper",            desc: "Automated vulnerability exploitation against target systems",                                   icon: Crosshair,   category: "Exploit",     mode: "red", route: "/dashboard/tools/sniper",             status: "live", danger: true },
  { name: "NMap Scanner",      desc: "Automated vulnerability exploitation against target systems",                                   icon: ScanLine,   category: "Recon",     mode: "red", route: "/dashboard/tools/nmap",       status: "live", danger: true },

  // 🔵 BLUE TEAM
  { name: "SSL Inspector",    desc: "TLS protocol audit, cipher strength grading, certificate expiry and CA trust chain validation",  icon: Lock,       category: "Crypto",     mode: "blue", route: "/dashboard/tools/ssl-inspector",    status: "live" },
  { name: "Firewall Tester",  desc: "Live port-state probing plus iptables/ufw rule parsing for dangerous misconfigurations",         icon: ShieldCheck,category: "Defense",    mode: "blue", route: "/dashboard/tools/firewall-tester",  status: "live" },
  { name: "Password Auditor", desc: "Entropy analysis, crack time estimation, policy compliance checks and bulk password audit",      icon: KeyRound,   category: "Auth",       mode: "blue", route: "/dashboard/tools/password-auditor", status: "live" },
  { name: "CVE Scanner",      desc: "Known CVE lookup with CVSS scoring and patch guidance for Apache, OpenSSL, Log4j and more",      icon: Bug,        category: "Vuln Intel", mode: "blue", route: "/dashboard/tools/cve-scanner",      status: "live" },
  { name: "Network Analyzer", desc: "DNS lookup, ICMP ping, port scan and hop-by-hop traceroute with security findings report",       icon: Network,    category: "Network",    mode: "blue", route: "/dashboard/tools/network-analyzer",  status: "live" },
  { name: "IDS Analyzer",     desc: "VirusTotal-powered URL and file threat scanning across 70+ AV engines with detection breakdown", icon: Eye,        category: "Detection",  mode: "blue", route: "/dashboard/tools/ids-analyzer",     status: "live" },
  { name: "SIEM Toolkit",     desc: "Security event correlation, alert triage, and incident timeline analysis",                       icon: BarChart3,  category: "SOC",        mode: "blue", status: "beta" },
  { name: "Log Analyzer",     desc: "Ingest system and application logs, surface IOCs and anomalous patterns via rule engine",         icon: FileSearch, category: "Forensics",  mode: "blue", status: "beta" },
  { name: "Network IDS",      desc: "Signature and behaviour-based intrusion detection with alert stream",                             icon: Radio,      category: "Defense",    mode: "blue", status: "beta" },

  // 🟢 EXPLORER — beginner-friendly with learning context
  { name: "Password Auditor",  desc: "Learn what makes a password strong — test entropy, crack time, and policy checks. Great starting point.",       icon: KeyRound,    category: "Fundamentals", mode: "explorer", route: "/dashboard/tools/password-auditor", difficulty: "beginner",     tip: "Start here! Understanding passwords is cybersecurity 101.", xp: 100 },
  { name: "SSL Inspector",     desc: "Understand how HTTPS works by inspecting real certificates, protocols and cipher strength of any website.",       icon: Lock,        category: "Fundamentals", mode: "explorer", route: "/dashboard/tools/ssl-inspector",    difficulty: "beginner",     tip: "Try inspecting google.com or your own site.", xp: 150 },
  { name: "Network Analyzer",  desc: "See how data travels across the internet — DNS, ping, port scan and traceroute explained step by step.",          icon: Network,     category: "Networking",   mode: "explorer", route: "/dashboard/tools/network-analyzer",  difficulty: "beginner",     tip: "Try scanme.nmap.org — a public host designed for learning.", xp: 200 },
  { name: "IDS Analyzer",      desc: "Scan URLs and files against 70+ antivirus engines. Learn how threat intelligence and detection work in practice.", icon: Eye,         category: "Threat Intel", mode: "explorer", route: "/dashboard/tools/ids-analyzer",     difficulty: "beginner",     tip: "Paste any suspicious link to see how analysts triage it.", xp: 150 },
  { name: "CVE Scanner",       desc: "Look up real-world vulnerabilities in common software. Understand CVSS scores and why patching matters.",          icon: Bug,         category: "Vuln Research",mode: "explorer", route: "/dashboard/tools/cve-scanner",      difficulty: "intermediate", tip: "Search 'log4j' to see one of the most critical bugs ever found.", xp: 250 },
  { name: "Port Scanner",      desc: "Learn what ports are, how TCP works, and what services expose themselves on a network — safely on your own lab.",  icon: ScanLine,    category: "Networking",   mode: "explorer", route: "/dashboard/tools/port-scanner",      difficulty: "intermediate", tip: "Scan localhost (127.0.0.1) to see your own open ports.", xp: 300 },
  { name: "Firewall Tester",   desc: "Understand firewall rules by testing port states and auditing iptables/ufw configs for common mistakes.",           icon: ShieldCheck, category: "Defense",      mode: "explorer", route: "/dashboard/tools/firewall-tester",  difficulty: "intermediate", tip: "Paste some example iptables rules into the Rule Audit tab.", xp: 300 },
  { name: "Directory Scanner", desc: "Discover how web servers expose hidden paths — a core recon skill used in both pentesting and bug bounty hunting.", icon: FolderSearch,category: "Web Security", mode: "explorer", route: "/dashboard/tools/directory-scanner",difficulty: "intermediate", tip: "Only scan targets you own or have explicit permission to test.", xp: 350 },
  { name: "Subdomain Finder",  desc: "Map out the attack surface of a domain by finding hidden subdomains — an essential recon technique.",               icon: Radar,       category: "Recon",        mode: "explorer", route: "/dashboard/tools/subdomain-finder",  difficulty: "advanced",     tip: "Try a domain you own to see your full surface area.", xp: 400 },
  { name: "Hashcat",           desc: "Learn how password hashing works and why strong hashes matter — crack intentionally weak hashes in a safe lab.",    icon: FlaskConical,category: "Cryptography", mode: "explorer", route: "/dashboard/tools/hashcat",           difficulty: "advanced",     tip: "Use wordlist mode on MD5 hashes to see how fast weak passwords fall.", xp: 500 },
];

// ── RED TEAM CARD ─────────────────────────────────────────────────────────────
function RedCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const canClick = !!(tool.route || tool.url);
  return (
    <div onClick={canClick ? onClick : undefined}
      className={`group relative rounded-xl border transition-all duration-200 ${
        canClick ? "cursor-pointer" : "cursor-default opacity-50"
      } bg-slate-900/60 border-slate-700/40 hover:border-rose-700/30 hover:bg-slate-900/80`}
    >
      {/* left accent bar — rose for danger, zinc for normal */}
      <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-colors ${
        tool.danger
          ? "bg-rose-800/50 group-hover:bg-rose-600/60"
          : "bg-zinc-700/40 group-hover:bg-zinc-500/60"
      }`}/>

      <div className="pl-5 pr-5 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            tool.danger
              ? "bg-rose-500/10 border border-rose-700/25 group-hover:bg-rose-500/15"
              : "bg-zinc-700/30 border border-zinc-600/30 group-hover:bg-zinc-700/50"
          }`}>
            <tool.icon className={`h-4 w-4 ${tool.danger ? "text-rose-400/80" : "text-zinc-400"}`}/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-semibold text-slate-100 truncate">{tool.name}</h3>
            <span className={`font-mono text-[9px] uppercase tracking-widest ${
              tool.danger ? "text-rose-700/80" : "text-zinc-600"
            }`}>{tool.category}</span>
          </div>
          <div className="flex-shrink-0">
            {canClick && (
              <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                tool.danger
                  ? "bg-rose-500/10 border border-rose-700/25 group-hover:bg-rose-500/20"
                  : "bg-zinc-700/30 border border-zinc-600/30 group-hover:bg-zinc-700/50"
              }`}>
                <ChevronRight className={`h-3 w-3 ${tool.danger ? "text-rose-500/70" : "text-zinc-400"}`}/>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{tool.desc}</p>

        {canClick && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`h-1 w-1 rounded-full ${tool.danger ? "bg-rose-600/60" : "bg-zinc-500"}`}/>
            <span className={`font-mono text-[9px] ${tool.danger ? "text-rose-700/70" : "text-zinc-600"}`}>
              {tool.danger ? "Offensive" : "Ready"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BLUE TEAM CARD ────────────────────────────────────────────────────────────
function BlueCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const canClick = !!(tool.route || tool.url);
  const isBeta = tool.status === "beta";
  return (
    <div onClick={canClick ? onClick : undefined}
      className={`group relative rounded-xl border transition-all duration-200 ${
        canClick ? "cursor-pointer" : "cursor-default opacity-50"
      } bg-slate-900/60 border-slate-700/40 hover:border-blue-500/40 hover:bg-slate-900/80`}
    >
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-blue-800/40 group-hover:bg-blue-500/60 transition-colors"/>
      <div className="pl-5 pr-5 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/15 transition-colors">
            <tool.icon className="h-4 w-4 text-blue-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-semibold text-slate-100 truncate">{tool.name}</h3>
            <span className="font-mono text-[9px] text-blue-600 uppercase tracking-widest">{tool.category}</span>
          </div>
          <div className="flex-shrink-0">
            {isBeta
              ? <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-700/60 text-slate-500 border border-slate-600/40">BETA</span>
              : canClick
              ? <div className="h-6 w-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <ChevronRight className="h-3 w-3 text-blue-500"/>
                </div>
              : null}
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{tool.desc}</p>
        {canClick && !isBeta && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-blue-500"/>
            <span className="font-mono text-[9px] text-blue-600">Ready</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EXPLORER CARD ─────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  beginner:     { label: "Beginner",     cls: "text-emerald-500/80", dot: "bg-emerald-500" },
  intermediate: { label: "Intermediate", cls: "text-amber-500/80",   dot: "bg-amber-500"   },
  advanced:     { label: "Advanced",     cls: "text-violet-500/80",  dot: "bg-violet-500"  },
};

function ExplorerCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const canClick = !!(tool.route || tool.url);
  const diff = tool.difficulty ? DIFF_CONFIG[tool.difficulty] : null;
  return (
    <div onClick={canClick ? onClick : undefined}
      className={`group relative rounded-xl border transition-all duration-200 ${
        canClick ? "cursor-pointer" : "cursor-default opacity-50"
      } bg-slate-900/60 border-slate-700/40 hover:border-emerald-700/25 hover:bg-slate-900/80`}
    >
      {/* left accent bar — color by difficulty */}
      <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-colors ${
        tool.difficulty === "beginner"     ? "bg-emerald-700/40 group-hover:bg-emerald-500/60" :
        tool.difficulty === "intermediate" ? "bg-amber-700/40   group-hover:bg-amber-500/60"   :
        tool.difficulty === "advanced"     ? "bg-violet-700/40  group-hover:bg-violet-500/60"  :
                                             "bg-slate-700/40   group-hover:bg-slate-500/60"
      }`}/>

      <div className="pl-5 pr-5 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-slate-700/40 border border-slate-600/30 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-700/60 transition-colors">
            <tool.icon className="h-4 w-4 text-slate-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-semibold text-slate-100 truncate">{tool.name}</h3>
            <span className={`font-mono text-[9px] uppercase tracking-widest ${diff ? diff.cls : "text-slate-600"}`}>
              {tool.category}
            </span>
          </div>
          <div className="flex-shrink-0">
            {canClick && (
              <div className="h-6 w-6 rounded-full bg-slate-700/30 border border-slate-600/30 flex items-center justify-center group-hover:bg-slate-700/50 transition-colors">
                <ChevronRight className="h-3 w-3 text-slate-400"/>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{tool.desc}</p>

        {tool.tip && (
          <div className="mt-3 flex items-start gap-1.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <Lightbulb className="h-3 w-3 text-amber-500/60 mt-0.5 flex-shrink-0"/>
            <p className="text-[10px] text-slate-500 leading-relaxed">{tool.tip}</p>
          </div>
        )}

        {diff && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`h-1 w-1 rounded-full ${diff.dot}`}/>
            <span className={`font-mono text-[9px] ${diff.cls}`}>{diff.label}</span>
            {tool.xp && <span className="font-mono text-[9px] text-slate-600 ml-1">· +{tool.xp} XP</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RED TEAM PAGE ─────────────────────────────────────────────────────────────
function RedTeamPage({ filtered, onNavigate }: { filtered: Tool[]; onNavigate: (t: Tool) => void }) {
  const dangerTools = filtered.filter(t => t.danger);
  const safeTools   = filtered.filter(t => !t.danger);
  const byCategory  = safeTools.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t); return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative p-6 rounded-xl border border-slate-700/40 bg-slate-900/60 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-full opacity-[0.03] pointer-events-none">
          <div className="absolute top-3 right-3 h-28 w-28 rounded-full border border-rose-400"/>
          <div className="absolute top-7 right-7 h-16 w-16 rounded-full border border-rose-400"/>
          <div className="absolute top-11 right-11 h-6 w-6 rounded-full border border-rose-400"/>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-rose-400/60"/>
          <span className="font-mono text-[10px] text-rose-700/80 uppercase tracking-[0.25em]">Offensive Security</span>
        </div>
        <h1 className="font-mono text-2xl font-bold text-rose-200/90 mb-1">Red Team</h1>
        <p className="text-sm text-slate-500 mb-4">Attack simulation · Penetration testing · Vulnerability exploitation</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600/70 animate-pulse"/>
            <span className="font-mono text-[10px] text-rose-700/60">{filtered.filter(t => t.status === "live").length} tools active</span>
          </div>
          <span className="text-slate-800">|</span>
          <span className="font-mono text-[10px] text-slate-600">{dangerTools.length} high-danger tools</span>
        </div>
      </div>

      {/* Danger zone */}
      {dangerTools.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-rose-700/60"/>
            <span className="font-mono text-xs text-rose-400/70 font-semibold">Offensive Tools</span>
            <span className="font-mono text-[10px] text-slate-600">— {dangerTools.length} available</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {dangerTools.map(t => <RedCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      )}

      {/* By category */}
      {Object.entries(byCategory).map(([cat, catTools]) => (
        <div key={cat}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-slate-600"/>
            <span className="font-mono text-xs text-slate-400 font-semibold">{cat}</span>
            <span className="font-mono text-[10px] text-slate-600">— {catTools.length} available</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {catTools.map(t => <RedCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── BLUE TEAM PAGE ────────────────────────────────────────────────────────────
function BlueTeamPage({ filtered, onNavigate }: { filtered: Tool[]; onNavigate: (t: Tool) => void }) {
  const live = filtered.filter(t => t.status === "live");
  const beta = filtered.filter(t => t.status === "beta");
  return (
    <div className="space-y-8">
      <div className="relative p-6 rounded-xl border border-blue-900/30 bg-slate-900/40 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-full opacity-[0.04] pointer-events-none">
          <div className="absolute top-3 right-3 h-28 w-28 rounded-full border border-blue-400"/>
          <div className="absolute top-7 right-7 h-16 w-16 rounded-full border border-blue-400"/>
          <div className="absolute top-11 right-11 h-6 w-6 rounded-full border border-blue-400"/>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-blue-400"/>
          <span className="font-mono text-[10px] text-blue-600 uppercase tracking-[0.25em]">Defensive Security</span>
        </div>
        <h1 className="font-mono text-2xl font-bold text-blue-300 mb-1">Blue Team</h1>
        <p className="text-sm text-slate-500 mb-4">Threat detection · Incident response · Security monitoring</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"/>
            <span className="font-mono text-[10px] text-blue-600/60">{live.length} tools ready</span>
          </div>
          <span className="text-slate-800">|</span>
          <span className="font-mono text-[10px] text-slate-600">{beta.length} in development</span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-4 w-0.5 rounded-full bg-blue-500"/>
          <span className="font-mono text-xs text-blue-400 font-semibold">Active Tools</span>
          <span className="font-mono text-[10px] text-slate-600">— {live.length} available</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {live.map(t => <BlueCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
        </div>
      </div>

      {beta.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-slate-600"/>
            <span className="font-mono text-xs text-slate-500 font-semibold">In Development</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {beta.map(t => <BlueCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── EXPLORER PAGE ─────────────────────────────────────────────────────────────
function ExplorerPage({ filtered, onNavigate }: { filtered: Tool[]; onNavigate: (t: Tool) => void }) {
  const beginner     = filtered.filter(t => t.difficulty === "beginner");
  const intermediate = filtered.filter(t => t.difficulty === "intermediate");
  const advanced     = filtered.filter(t => t.difficulty === "advanced");
  const totalXP      = filtered.reduce((a, t) => a + (t.xp || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-700/40 bg-slate-900/60 overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="h-4 w-4 text-slate-400"/>
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.25em]">Learning Mode</span>
            </div>
            <h1 className="font-mono text-2xl font-bold text-slate-100 mb-1">Explorer</h1>
            <p className="text-sm text-slate-500">New to cybersecurity? Start here. Each tool comes with context, tips, and guided usage.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">Total XP available</span>
            <span className="font-mono text-2xl font-bold text-amber-500">+{totalXP}</span>
          </div>
        </div>

        {/* Learning path visual */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {([
            ["Beginner",     beginner.length,     "text-emerald-400", "bg-emerald-500/10 border-emerald-500/20"],
            ["Intermediate", intermediate.length,  "text-amber-400",   "bg-amber-500/10 border-amber-500/20"],
            ["Advanced",     advanced.length,      "text-violet-400",  "bg-violet-500/10 border-violet-500/20"],
          ] as [string, number, string, string][]).map(([label, count, tc, bg]) => (
            <div key={label} className={`p-3 rounded-lg border ${bg} text-center`}>
              <div className={`font-mono text-xl font-bold ${tc}`}>{count}</div>
              <div className={`font-mono text-[9px] ${tc} opacity-70 uppercase tracking-wider mt-0.5`}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Beginner */}
      {beginner.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-emerald-500"/>
            <span className="font-mono text-xs text-emerald-400 font-semibold">Start Here — Beginner</span>
            <span className="font-mono text-[10px] text-slate-600">— {beginner.length} available</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {beginner.map(t => <ExplorerCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      )}

      {/* Intermediate */}
      {intermediate.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-amber-500"/>
            <span className="font-mono text-xs text-amber-400 font-semibold">Level Up — Intermediate</span>
            <span className="font-mono text-[10px] text-slate-600">— {intermediate.length} available</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {intermediate.map(t => <ExplorerCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      )}

      {/* Advanced */}
      {advanced.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-0.5 rounded-full bg-violet-500"/>
            <span className="font-mono text-xs text-violet-400 font-semibold">Expert Zone — Advanced</span>
            <span className="font-mono text-[10px] text-slate-600">— {advanced.length} available</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {advanced.map(t => <ExplorerCard key={t.name} tool={t} onClick={() => onNavigate(t)}/>)}
          </div>
        </div>
      )}

      {/* Resource footer */}
      <div className="p-5 rounded-xl border border-slate-700/40 bg-slate-900/40">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-slate-500"/>
          <span className="font-mono text-xs text-slate-500 font-semibold">Recommended Learning Resources</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            ["TryHackMe", "Guided cybersecurity rooms for beginners", "tryhackme.com"],
            ["Hack The Box", "Practice on real vulnerable machines", "hackthebox.com"],
            ["OWASP Top 10", "Learn the most critical web vulnerabilities", "owasp.org"],
          ] as [string, string, string][]).map(([name, desc, url]) => (
            <a key={name} href={`https://${url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-colors group">
              <Map className="h-3.5 w-3.5 text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-slate-400 transition-colors"/>
              <div>
                <p className="font-mono text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">{name}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
const Tools = () => {
  const { mode } = useTeamMode();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = tools.filter(
    t => t.mode === mode && t.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleNavigate(tool: Tool) {
    if (tool.route) navigate(tool.route);
    else if (tool.url) window.open(tool.url, "_blank");
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 pointer-events-none"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tools..."
          title="Search tools"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 font-mono text-sm text-foreground placeholder:text-slate-600 focus:outline-none focus:border-slate-500/60 transition-colors"
        />
      </div>

      {mode === "red"      && <RedTeamPage      filtered={filtered} onNavigate={handleNavigate}/>}
      {mode === "blue"     && <BlueTeamPage     filtered={filtered} onNavigate={handleNavigate}/>}
      {mode === "explorer" && <ExplorerPage     filtered={filtered} onNavigate={handleNavigate}/>}
    </div>
  );
};

export default Tools;