import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

export interface SandboxTarget {
  id: string;
  label: string;
  host: string;
  kind: "network" | "web";
  notes: string;
}

/**
 * Banner shown at the top of every tool restricted to sandbox targets,
 * per the "clear Sandbox Mode indicator" requirement.
 */
export function SandboxBanner({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 mb-4">
      <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <span className="font-semibold">SANDBOX ENVIRONMENT</span>
        <p className="text-emerald-300/80">
          {text || "Testing is restricted to authorized training targets — arbitrary public IPs and domains are rejected by the backend."}
        </p>
      </div>
    </div>
  );
}

/**
 * Dropdown of approved sandbox targets, fetched from the backend allowlist
 * so the frontend and backend can never drift apart. Replaces free-text
 * target/host/url inputs on the restricted tools.
 */
export function SandboxTargetPicker({
  kind,
  value,
  onChange,
  label = "Target",
}: {
  kind: "network" | "web";
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [targets, setTargets] = useState<SandboxTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sandbox/targets?kind=${kind}`)
      .then((r) => r.json())
      .then((d) => {
        const list: SandboxTarget[] = d.targets || [];
        setTargets(list);
        if (!value && list.length) onChange(list[0].id);
      })
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
      >
        {loading && <option>Loading sandbox targets…</option>}
        {!loading && targets.length === 0 && <option>No sandbox targets available</option>}
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
