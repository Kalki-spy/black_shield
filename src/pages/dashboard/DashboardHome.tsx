import { Shield, AlertTriangle, Activity, Users, TrendingUp, Clock, LogOut, Swords, ShieldCheck, Compass, Crosshair, Target, Bug, Trophy, Lock, FileSearch, Award, BookOpen } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTeamMode, TeamMode } from "@/contexts/TeamModeContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

const modeInfo: Record<TeamMode, { title: string; subtitle: string; icon: typeof Swords; color: string }> = {
  red: { title: "Red Team Dashboard", subtitle: "Offensive security simulations · Sandboxed environment", icon: Swords, color: "text-red-500" },
  blue: { title: "Blue Team SOC Dashboard", subtitle: "Security Operations Center · SIEM analytics", icon: ShieldCheck, color: "text-blue-500" },
  explorer: { title: "Explorer Dashboard", subtitle: "Free exploration · Learning & discovery", icon: Compass, color: "text-emerald-400" },
};

const modeStats: Record<TeamMode, { label: string; value: string; change: string; icon: typeof Shield }[]> = {
  red: [
    { label: "ACTIVE EXPLOITS", value: "23", change: "+4 today", icon: Crosshair },
    { label: "TARGETS MAPPED", value: "156", change: "+12 this week", icon: Target },
    { label: "VULNS DISCOVERED", value: "47", change: "+7 today", icon: Bug },
    { label: "CTF SCORE", value: "2,840", change: "Rank #3", icon: Trophy },
  ],
  blue: [
    { label: "ACTIVE ALERTS", value: "34", change: "-8 from yesterday", icon: AlertTriangle },
    { label: "THREATS BLOCKED", value: "1247", change: "+89 today", icon: Shield },
    { label: "CASES OPEN", value: "12", change: "3 critical", icon: Lock },
    { label: "SIEM EVENTS", value: "45.2K", change: "+2.1K/hr", icon: FileSearch },
  ],
  explorer: [
    { label: "LABS COMPLETED", value: "18", change: "+3 this week", icon: BookOpen },
    { label: "SKILLS LEARNED", value: "42", change: "Level 5", icon: Award },
    { label: "CHALLENGES", value: "7", change: "2 in progress", icon: Target },
    { label: "BADGES", value: "12", change: "+1 new", icon: Trophy },
  ],
};

const THREAT_NAMES = ["Brute Force","SQL Injection","Port Scan","C2 Beacon","SSH Brute Force","XSS Attempt","Directory Traversal","Privilege Escalation","Phishing Link Clicked","DNS Tunneling","RDP Attack","LDAP Injection"];
const SEVERITIES = ["CRITICAL","CRITICAL","HIGH","HIGH","HIGH","MEDIUM","MEDIUM","LOW"] as const;
const randIp = () => `10.0.${Math.floor(Math.random()*5)}.${Math.floor(Math.random()*254)+1}`;
const randSev = () => SEVERITIES[Math.floor(Math.random()*SEVERITIES.length)];
const initThreats = () => Array.from({length:6},(_,i) => ({ name: THREAT_NAMES[i], ip: randIp(), severity: randSev(), secs: (i+1)*3*60 }));
const initChart = () => {
  const now = new Date();
  return Array.from({length:8},(_,i) => {
    const t = new Date(now.getTime() - (7-i)*5*60000);
    const h = t.getHours().toString().padStart(2,"0"), m = t.getMinutes().toString().padStart(2,"0");
    return { time: `${h}:${m}`, attacks: Math.floor(Math.random()*60)+5, defenses: Math.floor(Math.random()*50)+10, alerts: Math.floor(Math.random()*25)+2 };
  });
};
const fmtTime = (s:number) => s < 60 ? `${s}s ago` : `${Math.floor(s/60)}m ago`;

const severityColor = (s: string) => {
  switch (s) {
    case "CRITICAL": return "bg-red-500/20 text-red-400 border border-red-500/40";
    case "HIGH": return "bg-orange-500/20 text-orange-400 border border-orange-500/40";
    case "MEDIUM": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40";
    case "LOW": return "bg-muted text-muted-foreground border border-border";
    default: return "bg-muted text-muted-foreground";
  }
};

const DashboardHome = () => {
  const { mode } = useTeamMode();
  const navigate = useNavigate();
  const info = modeInfo[mode];
  const stats = modeStats[mode];
  const { signOut, user } = useAuth();

  const [chartData, setChartData] = useState(initChart);
  const [threats, setThreats] = useState(initThreats);
  const [tick, setTick] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date());
      setTick(p => p + 1);
      // Tick up threat times
      setThreats(prev => {
        let updated = prev.map(t => ({...t, secs: t.secs + 1}));
        // randomly add new threat
        if (Math.random() < 0.08) {
          const newThreat = { name: THREAT_NAMES[Math.floor(Math.random()*THREAT_NAMES.length)], ip: randIp(), severity: randSev(), secs: 0 };
          updated = [newThreat, ...updated.slice(0,5)];
        }
        return updated;
      });
      // Occasionally push new chart point
      if (Math.random() < 0.15) {
        setChartData(prev => {
          const now = new Date();
          const h = now.getHours().toString().padStart(2,"0"), m = now.getMinutes().toString().padStart(2,"0");
          const newPt = { time: h+":"+m, attacks: Math.floor(Math.random()*60)+5, defenses: Math.floor(Math.random()*50)+10, alerts: Math.floor(Math.random()*25)+2 };
          return [...prev.slice(-7), newPt];
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
            <info.icon className={`h-6 w-6 ${info.color}`} />
            {info.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{info.subtitle}{user ? <span className="text-primary font-mono"> · {user.username}</span> : null}</p>
        </div>
        <div className="flex items-center gap-3"><span className="font-mono text-xs text-primary border border-primary/20 px-2 py-1 rounded flex items-center gap-1.5"><Activity className="h-3 w-3 animate-pulse" />{currentTime.toLocaleTimeString()}</span>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="font-mono text-xs border-border text-muted-foreground hover:text-destructive hover:border-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="neon-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">{stat.label}</span>
              <stat.icon className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{stat.value}</p>
            <p className="text-xs font-mono text-primary mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Chart + Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 neon-card rounded-lg p-6">
          <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase mb-4">
            Activity Timeline
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDefenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} stroke="hsl(220 15% 15%)" />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} stroke="hsl(220 15% 15%)" />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 7%)", border: "1px solid hsl(150 20% 15%)", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono" }}
                labelStyle={{ color: "hsl(150 60% 90%)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <Area type="monotone" dataKey="attacks" stroke="#ef4444" fill="url(#colorAttacks)" strokeWidth={2} name="Attacks" />
              <Area type="monotone" dataKey="defenses" stroke="#3b82f6" fill="url(#colorDefenses)" strokeWidth={2} name="Defenses" />
              <Area type="monotone" dataKey="alerts" stroke="#f59e0b" fill="url(#colorAlerts)" strokeWidth={2} name="Alerts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Threat Feed */}
        <div className="neon-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase">
              Live Threat Feed
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              REAL-TIME
            </span>
          </div>
          <div className="space-y-1">
            {threats.map((t, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{t.ip}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${severityColor(t.severity)}`}>{t.severity}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{fmtTime(t.secs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MITRE ATT&CK Coverage */}
      <div className="neon-card rounded-lg p-6">
        <h3 className="font-mono text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase mb-4">
          MITRE ATT&CK Coverage
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {["Recon", "Resource Dev", "Initial Access", "Execution", "Persistence", "Priv Esc", "Defense Evasion", "Credential Access"].map((tactic, i) => (
            <div key={tactic} className="text-center">
              <div className="h-8 rounded bg-primary/30 flex items-center justify-center mb-1">
                <span className="text-xs font-mono text-foreground">{Math.floor(Math.random() * 12) + 2}</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{tactic}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;