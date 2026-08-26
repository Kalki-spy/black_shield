import { Shield, Play, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { useTeamMode } from "@/contexts/TeamModeContext";

type TeamMode = "red" | "blue" | "explorer";

interface Scenario {
  title: string;
  type: string;
  duration: string;
  difficulty: string;
  status: "available" | "completed" | "in-progress";
  mode: TeamMode;
}

const scenarios: Scenario[] = [
  // 🔴 RED TEAM (Offensive)
  { title: "Ransomware Attack Simulation", type: "Offensive Operations", duration: "45 min", difficulty: "Advanced", status: "available", mode: "red" },
  { title: "Web App Exploitation Lab", type: "Application Exploitation", duration: "40 min", difficulty: "Intermediate", status: "in-progress", mode: "red" },
  { title: "Privilege Escalation Mission", type: "Post Exploitation", duration: "60 min", difficulty: "Advanced", status: "available", mode: "red" },

  // 🔵 BLUE TEAM (Defensive)
  { title: "Network Intrusion Detection", type: "Network Security", duration: "60 min", difficulty: "Advanced", status: "available", mode: "blue" },
  { title: "Phishing Campaign Defense", type: "Social Engineering Defense", duration: "30 min", difficulty: "Intermediate", status: "completed", mode: "blue" },
  { title: "Insider Threat Investigation", type: "Digital Forensics", duration: "50 min", difficulty: "Advanced", status: "available", mode: "blue" },

  // 🟢 EXPLORER (Basics)
  { title: "Cloud Misconfiguration Hunt", type: "Cloud Security Basics", duration: "35 min", difficulty: "Beginner", status: "available", mode: "explorer" },
  { title: "Intro to Incident Response", type: "Security Fundamentals", duration: "25 min", difficulty: "Beginner", status: "available", mode: "explorer" },
  { title: "Basic Log Analysis", type: "Monitoring Basics", duration: "30 min", difficulty: "Beginner", status: "available", mode: "explorer" },
];

const statusIcon = (s: string) => {
  if (s === "completed") return <CheckCircle className="h-4 w-4 text-success" />;
  if (s === "in-progress") return <Clock className="h-4 w-4 text-warning" />;
  return <Play className="h-4 w-4 text-primary" />;
};

const Scenarios = () => {
  const { mode } = useTeamMode();

  const filteredScenarios = scenarios.filter((sc) => sc.mode === mode);

  const modeColor = () => {
    if (mode === "red") return "text-red-500";
    if (mode === "blue") return "text-blue-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-2xl font-bold font-mono ${modeColor()}`}>
          {mode.toUpperCase()} Team Scenarios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mode-specific cybersecurity simulation exercises
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredScenarios.map((sc) => (
          <div
            key={sc.title}
            className="neon-card rounded-lg p-6 group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className={`h-5 w-5 ${modeColor()}`} />
              </div>
              {statusIcon(sc.status)}
            </div>

            <h3 className="font-mono font-semibold text-foreground mb-1">
              {sc.title}
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              {sc.type}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {sc.duration}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted font-mono">
                {sc.difficulty}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-primary text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              <span>
                {sc.status === "completed"
                  ? "Review"
                  : sc.status === "in-progress"
                  ? "Continue"
                  : "Start"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scenarios;