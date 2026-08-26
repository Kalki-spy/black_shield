import { Flag, Users, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeamMode } from "@/contexts/TeamModeContext";

type TeamMode = "red" | "blue" | "explorer";

interface Challenge {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  solves: number;
  category: string;
  active: boolean;
  mode: TeamMode;
}

const challenges: Challenge[] = [
  { title: "SQL Injection 101", difficulty: "Easy", points: 100, solves: 342, category: "Web Exploitation", active: true, mode: "red" },
  { title: "Buffer Overflow", difficulty: "Hard", points: 500, solves: 45, category: "Binary Exploitation", active: true, mode: "red" },
  { title: "Reverse Shell", difficulty: "Hard", points: 400, solves: 67, category: "Post Exploitation", active: false, mode: "red" },

  { title: "Packet Capture Analysis", difficulty: "Easy", points: 150, solves: 256, category: "Network Forensics", active: true, mode: "blue" },
  { title: "SIEM Alert Triage", difficulty: "Medium", points: 300, solves: 98, category: "SOC Operations", active: true, mode: "blue" },
  { title: "Malware Log Investigation", difficulty: "Hard", points: 450, solves: 52, category: "Threat Hunting", active: true, mode: "blue" },

  { title: "XSS Playground", difficulty: "Medium", points: 200, solves: 189, category: "Web Basics", active: true, mode: "explorer" },
  { title: "JWT Token Basics", difficulty: "Easy", points: 120, solves: 210, category: "Authentication", active: true, mode: "explorer" },
  { title: "Intro to Linux CLI", difficulty: "Easy", points: 80, solves: 320, category: "Foundations", active: true, mode: "explorer" },
];

const difficultyColor = (d: string) => {
  if (d === "Easy") return "text-success bg-success/10";
  if (d === "Medium") return "text-warning bg-warning/10";
  return "text-destructive bg-destructive/10";
};

// 🔥 NEW: Team-based Flag Color
const flagColor = (mode: TeamMode) => {
  if (mode === "red") return "text-red-500";
  if (mode === "blue") return "text-blue-500";
  return "text-green-500";
};

const CTF = () => {
  const { mode } = useTeamMode();

  const filteredChallenges = challenges.filter((ch) => ch.mode === mode);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">
            {mode.toUpperCase()} Challenges
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mode-specific Capture The Flag labs
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono text-xs">
          <Flag className={`h-3.5 w-3.5 mr-2 ${flagColor(mode)}`} />
          Join Competition
        </Button>
      </div>

      {/* Challenges */}
      <div className="space-y-3">
        {filteredChallenges.map((ch) => (
          <div
            key={ch.title}
            className="neon-card rounded-lg p-5 flex items-center gap-4 group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Flag className={`h-5 w-5 ${flagColor(ch.mode)}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-semibold text-foreground">
                  {ch.title}
                </h3>
                {!ch.active && (
                  <span className="text-xs text-muted-foreground font-mono">
                    (Locked)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {ch.solves} solves
                </span>
                <span>{ch.category}</span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono ${difficultyColor(
                ch.difficulty
              )}`}
            >
              {ch.difficulty}
            </span>

            <span className="font-mono text-sm font-bold text-primary">
              {ch.points}pts
            </span>

            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CTF;