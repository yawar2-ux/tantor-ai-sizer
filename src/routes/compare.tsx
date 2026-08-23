import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { listScenarios, scenarioTitle, type SavedScenario } from "@/lib/scenarios";
import { computeScenario } from "@/engine";
import { deltaChip, headlines } from "@/lib/headline";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare scenarios | Tantor Gen AI Sizer" },
      { name: "description", content: "Side-by-side comparison of two saved Tantor sizing scenarios with deltas." },
      { property: "og:title", content: "Compare scenarios | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Two saved scenarios in two columns, with a delta on every headline number." },
    ],
  }),
  component: ComparePage,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";

function Chip({ tone, label }: { tone: "good" | "bad" | "flat"; label: string }) {
  const cls =
    tone === "good"
      ? "bg-olive/15 text-olive"
      : tone === "bad"
        ? "bg-rose/15 text-rose"
        : "bg-muted text-muted-foreground";
  return <span className={`ml-2 rounded px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function ComparePage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<SavedScenario[]>([]);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  useEffect(() => {
    if (user) void listScenarios().then(setRows).catch(() => setRows([]));
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <div className="max-w-lg">
        <PageHeader eyebrow="Compare" title="Sign in to compare saved scenarios" />
        <Link to="/auth" className="rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground">
          Go to sign in
        </Link>
      </div>
    );
  }

  const a = rows.find((r) => r.id === aId);
  const b = rows.find((r) => r.id === bId);
  const ra = a ? computeScenario(a.data) : null;
  const rb = b ? computeScenario(b.data) : null;
  const ha = ra ? headlines(ra) : [];
  const hb = rb ? headlines(rb) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compare"
        title="Side by side"
        intro="Pick two saved scenarios. Column B carries a delta chip against column A on every headline number."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Scenario A", value: aId, set: setAId },
          { label: "Scenario B", value: bId, set: setBId },
        ].map((s) => (
          <div key={s.label}>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{s.label}</label>
            <select className={field} value={s.value} onChange={(e) => s.set(e.target.value)}>
              <option value="">Select a saved scenario</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {scenarioTitle(r)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {ra && rb ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse bg-surface">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Metric</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  {scenarioTitle(a!)}
                </th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  {scenarioTitle(b!)}
                </th>
              </tr>
            </thead>
            <tbody>
              {ha.map((m, i) => {
                const other = hb[i]!;
                const chip = deltaChip(m.value, other.value, m.betterWhenLower);
                return (
                  <tr key={m.label} className="border-t border-border">
                    <td className="px-3 py-2 text-sm text-muted-foreground">{m.label}</td>
                    <td className="numeral px-3 py-2 text-sm font-semibold">{m.display}</td>
                    <td className="numeral px-3 py-2 text-sm font-semibold">
                      {other.display}
                      <Chip tone={chip.tone} label={chip.label} />
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-sm text-muted-foreground">Binding constraint</td>
                <td className="px-3 py-2 text-sm">{ra.sizing.constraint}</td>
                <td className="px-3 py-2 text-sm">{rb.sizing.constraint}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-sm text-muted-foreground">Model / GPU / precision</td>
                <td className="px-3 py-2 text-sm">{`${ra.model.name}, ${ra.gpu.name}, ${ra.precision.name}`}</td>
                <td className="px-3 py-2 text-sm">{`${rb.model.name}, ${rb.gpu.name}, ${rb.precision.name}`}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select two scenarios to see the comparison.</p>
      )}
    </div>
  );
}
