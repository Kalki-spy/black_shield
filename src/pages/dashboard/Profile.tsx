import { useState, useEffect } from "react";
import { Mail, Calendar, Edit, Shield, Save, X, KeyRound, Clock, Activity, Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMode } from "@/contexts/TeamModeContext";

// ── Per-mode color tokens ──────────────────────────────────────────────────────
const MODE_COLOR = {
  red:      "#f87171",
  blue:     "#60a5fa",
  explorer: "#34d399",
} as const;

const THEME = {
  red: {
    cardBorder:      "border-border",
    cardGlow:        "",
    cardBg:          "bg-card",
    avatarBorder:    "border-border",
    avatarBg:        "bg-muted",
    avatarText:      "",
    modePill:        "bg-red-500/10 border-red-500/30",
    statValue:       "",
    statCardBorder:  "border-border",
    statCardBg:      "bg-muted/30",
    sectionLabel:    "",
    iconColor:       "",
    trackLabel:      "",
    badgeBorder:     "border-border",
    badgeBg:         "bg-muted/40",
    badgeText:       "",
    badgeIcon:       "",
    liveDot:         "bg-red-400",
    liveText:        "",
    itemBg:          "bg-muted/30",
    itemBorder:      "border-border",
    clockColor:      "",
    terminalColor:   "",
    editHover:       "hover:border-red-500/40",
    inputFocus:      "focus:ring-red-500/40 focus:border-red-500/40",
    saveBg:          "bg-red-500/15 border-red-500/30 hover:bg-red-500/25",
  },
  blue: {
    cardBorder:      "border-border",
    cardGlow:        "",
    cardBg:          "bg-card",
    avatarBorder:    "border-border",
    avatarBg:        "bg-muted",
    avatarText:      "",
    modePill:        "bg-blue-500/10 border-blue-500/30",
    statValue:       "",
    statCardBorder:  "border-border",
    statCardBg:      "bg-muted/30",
    sectionLabel:    "",
    iconColor:       "",
    trackLabel:      "",
    badgeBorder:     "border-border",
    badgeBg:         "bg-muted/40",
    badgeText:       "",
    badgeIcon:       "",
    liveDot:         "bg-blue-400",
    liveText:        "",
    itemBg:          "bg-muted/30",
    itemBorder:      "border-border",
    clockColor:      "",
    terminalColor:   "",
    editHover:       "hover:border-blue-500/40",
    inputFocus:      "focus:ring-blue-500/40 focus:border-blue-500/40",
    saveBg:          "bg-blue-500/15 border-blue-500/30 hover:bg-blue-500/25",
  },
  explorer: {
    cardBorder:      "border-border",
    cardGlow:        "",
    cardBg:          "bg-card",
    avatarBorder:    "border-border",
    avatarBg:        "bg-muted",
    avatarText:      "",
    modePill:        "bg-emerald-500/10 border-emerald-500/30",
    statValue:       "",
    statCardBorder:  "border-border",
    statCardBg:      "bg-muted/30",
    sectionLabel:    "",
    iconColor:       "",
    trackLabel:      "",
    badgeBorder:     "border-border",
    badgeBg:         "bg-muted/40",
    badgeText:       "",
    badgeIcon:       "",
    liveDot:         "bg-emerald-400",
    liveText:        "",
    itemBg:          "bg-muted/30",
    itemBorder:      "border-border",
    clockColor:      "",
    terminalColor:   "",
    editHover:       "hover:border-emerald-500/40",
    inputFocus:      "focus:ring-emerald-500/40 focus:border-emerald-500/40",
    saveBg:          "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25",
  },
} as const;

const BADGES_BY_MODE: Record<string, string[]> = {
  red:      ["First Blood", "SQLi Master", "Network Ninja", "Payload Crafter", "Zero Day Hunter", "RCE King"],
  blue:     ["Incident Responder", "Log Analyst", "Threat Hunter", "SIEM Architect", "Firewall Pro", "SOC Veteran"],
  explorer: ["CTF Rookie", "Crypto Breaker", "Forensics Lead", "Bug Hunter", "OSINT Pro", "Script Kiddie Slayer"],
};

const STATS_BY_MODE: Record<string, { label: string; value: string }[]> = {
  red:      [{ label: "CTFs Solved", value: "47" }, { label: "Rank", value: "#128" }, { label: "Exploits Written", value: "23" }, { label: "Points", value: "8,420" }],
  blue:     [{ label: "Incidents Handled", value: "31" }, { label: "Alerts Triaged", value: "1,240" }, { label: "Rules Written", value: "18" }, { label: "Uptime SLA", value: "99.9%" }],
  explorer: [{ label: "Labs Completed", value: "18" }, { label: "Skills Learned", value: "42" }, { label: "Challenges", value: "7" }, { label: "Badges", value: "12" }],
};

const ACTIVITY_LOG = [
  { action: "Logged in",                        time: "Just now",  icon: "🔐" },
  { action: "Ran SSL Analyzer on example.com",  time: "2 min ago", icon: "🔒" },
  { action: "Opened Directory Scanner",         time: "5 min ago", icon: "📁" },
  { action: "Viewed Metasploit Scanner",        time: "12 min ago",icon: "💻" },
  { action: "Cracked 3 hashes with Hashcat",    time: "18 min ago",icon: "🔑" },
];

const MODE_LABEL: Record<string, string> = {
  red:      "Red Team Specialist",
  blue:     "Blue Team Defender",
  explorer: "Security Explorer",
};

export default function Profile() {
  const { user } = useAuth();
  const { mode } = useTeamMode();
  const t = THEME[mode as keyof typeof THEME] ?? THEME.red;
  const c = MODE_COLOR[mode as keyof typeof MODE_COLOR] ?? MODE_COLOR.red;

  const [editing, setEditing]         = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio]                 = useState("Cybersecurity professional on the BlackShield platform.");
  const [savedName, setSavedName]     = useState("");
  const [savedBio, setSavedBio]       = useState("Cybersecurity professional on the BlackShield platform.");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(`profile_${user.id}`);
    if (raw) {
      const d = JSON.parse(raw);
      setSavedName(d.displayName || user.username);
      setSavedBio(d.bio || savedBio);
      setDisplayName(d.displayName || user.username);
      setBio(d.bio || savedBio);
    } else {
      setDisplayName(user.username);
      setSavedName(user.username);
    }
  }, [user]);

  function handleSave() {
    if (user) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify({ displayName, bio }));
      setSavedName(displayName);
      setSavedBio(bio);
    }
    setEditing(false);
  }
  function handleCancel() {
    setDisplayName(savedName);
    setBio(savedBio);
    setEditing(false);
  }

  const stats  = STATS_BY_MODE[mode]  ?? STATS_BY_MODE.red;
  const badges = BADGES_BY_MODE[mode] ?? BADGES_BY_MODE.red;
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recently";

  const card = `rounded-lg border ${t.cardBorder} ${t.cardGlow} ${t.cardBg}`;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono text-foreground">Profile</h1>
        <div className="flex items-center gap-2 text-xs font-mono">
          <Activity className="h-3.5 w-3.5 animate-pulse" style={{ color: c }} />
          <span style={{ color: c }}>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ── Main profile card ─────────────────────────────────────────── */}
      <div className={`${card} p-6`}>
        <div className="flex flex-col sm:flex-row items-start gap-5">

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`h-20 w-20 rounded-full border-2 ${t.avatarBorder} ${t.avatarBg} flex items-center justify-center`}>
              <span className="font-mono text-3xl font-bold" style={{ color: c }}>
                {(savedName || user?.username || "?")[0].toUpperCase()}
              </span>
            </div>
            <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center ${t.liveDot}`}>
              <div className={`h-2 w-2 rounded-full animate-pulse ${t.liveDot} opacity-60`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Display Name</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className={`w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-1 ${t.inputFocus}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={2}
                    placeholder="Tell us about yourself"
                    className={`w-full px-3 py-2 bg-background border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-1 ${t.inputFocus} resize-none`}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md border font-mono text-xs transition-colors ${t.saveBg}`} style={{ color: c }}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h2 className="text-xl font-bold font-mono text-foreground">{savedName || user?.username}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${t.modePill}`} style={{ color: c }}>
                    {mode.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{savedBio}</p>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />{user?.email || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />Joined {joinDate}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: c }}>
                    <Terminal className="h-3.5 w-3.5" />{MODE_LABEL[mode]}
                  </span>
                </div>
              </>
            )}
          </div>

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-muted-foreground font-mono text-xs transition-colors flex-shrink-0"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: c, opacity: 0.55 }}>
          // Stats — {mode} mode
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`rounded-lg border ${t.statCardBorder} ${t.statCardBg} p-4 text-center`}>
              <p className="text-2xl font-bold font-mono" style={{ color: c }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Earned Badges ──────────────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4" style={{ color: c }} />
          <h3 className="font-mono text-sm font-semibold text-foreground uppercase tracking-widest">Earned Badges</h3>
          <span className="ml-auto text-[10px] font-mono" style={{ color: c, opacity: 0.4 }}>{mode} track</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map(badge => (
            <div key={badge} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${t.badgeBorder} ${t.badgeBg}`}>
              <Shield className="h-3.5 w-3.5" style={{ color: c }} />
              <span className="text-xs font-mono" style={{ color: c }}>{badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4" style={{ color: c }} />
          <h3 className="font-mono text-sm font-semibold text-foreground uppercase tracking-widest">Recent Activity</h3>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono" style={{ color: c }}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.liveDot} animate-pulse`} /> LIVE
          </span>
        </div>
        <div className="space-y-2">
          {ACTIVITY_LOG.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-md ${t.itemBg} border ${t.itemBorder}`}>
              <span className="text-lg">{item.icon}</span>
              <p className="flex-1 text-sm font-mono text-foreground">{item.action}</p>
              <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Account Details ─────────────────────────────────────────────── */}
      <div className={`${card} p-5`}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: c, opacity: 0.55 }}>
          // Account Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Username",     value: user?.username || "—" },
            { label: "Email",        value: user?.email    || "—" },
            { label: "User ID",      value: user?.id ? `#${user.id}` : "—" },
            { label: "Member Since", value: joinDate },
          ].map(item => (
            <div key={item.label} className={`p-3 rounded-md ${t.itemBg} border ${t.itemBorder}`}>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="font-mono text-sm text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}