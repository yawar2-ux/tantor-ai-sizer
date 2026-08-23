import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSharedScenario, scenarioTitle, type SavedScenario } from "@/lib/scenarios";
import { computeScenario, PROVIDER_LABEL, type ScenarioResult } from "@/engine";
import { headlines } from "@/lib/headline";
import { inrLakh, num } from "@/lib/format";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared sizing | Tantor Gen AI Sizer" },
      { name: "description", content: "Read-only view of a shared Tantor sizing scenario and its INR cost summary." },
      { property: "og:title", content: "Shared sizing | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Client-safe read-only Tantor sizing summary." },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();
  const [row, setRow] = useState<SavedScenario | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    getSharedScenario(token)
      .then((r) => {
        if (!r) return setState("missing");
        setRow(r);
        setResult(computeScenario(r.data));
        setState("ok");
      })
      .catch(() => setState("missing"));
  }, [token]);

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading shared scenario…</p>;
  if (state === "missing" || !row || !result)
    return (
      <div className="max-w-lg">
        <PageHeader eyebrow="Shared link" title="This link is not available" />
        <p className="text-sm text-muted-foreground">
          The scenario may have been unshared or deleted. Ask the Translab presales owner for a fresh link.
        </p>
      </div>
    );

  const cards = headlines(result).filter(
    (h) => !["Opex per year", "TTFT estimate", "TPOT estimate"].includes(h.label),
  );

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Read only" title={scenarioTitle(row)} intro="Shared summary. Figures in Indian rupees." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((h) => (
          <div key={h.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{h.label}</div>
            <div className="numeral mt-1 text-2xl font-semibold text-brand">{h.display}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-lg">Platform</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Model", result.model.name],
            ["GPU", result.gpu.name],
            ["Precision", result.precision.name],
            ["Binding constraint", result.sizing.constraint],
            ["GPU nodes", num(result.environments.totalGpuNodes)],
            ["Storage", `${num(result.environments.totalStorageTB, 1)} TB`],
            ["Best cloud", PROVIDER_LABEL[result.cloud.bestProvider]],
            ["Cloud 3-year TCO", inrLakh(result.cloud.bestTco3L)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="numeral">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
