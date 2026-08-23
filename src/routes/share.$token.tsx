import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSharedScenario, scenarioTitle, type SavedScenario } from "@/lib/scenarios";
import { computeScenario, PROVIDER_LABEL, type ScenarioResult } from "@/engine";
import { headlines } from "@/lib/headline";
import { inrLakh, num } from "@/lib/format";

const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
const td = "px-3 py-2 text-sm";
const ENVS = ["Prod", "Dev", "UAT", "DR"] as const;

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
        <PageHeader eyebrow="Shared link" title="This link is no longer available" />
        <p className="text-sm text-muted-foreground">
          This share link is no longer available. It may have been revoked or the scenario deleted. Ask the Translab
          presales owner for a fresh link.
        </p>
      </div>
    );

  const cards = headlines(result).filter(
    (h) => !["Opex per year", "TTFT estimate", "TPOT estimate"].includes(h.label),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tantor Gen AI Sizer"
        title={scenarioTitle(row)}
        intro="Shared read-only view of a Tantor sizing. Figures in Indian rupees. No assumptions or rate card are included."
      />

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

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-lg">Bill of materials</h2>
        <table className="w-full">
          <tbody>
            {(
              [
                ["Model / precision", `${result.model.name}, ${result.precision.name}`],
                ["GPU cards", `${num(result.environments.totalPhysicalGpus)} x ${result.gpu.name}`],
                ["GPU nodes", `${num(result.environments.totalGpuNodes)} x ${result.template.name}`],
                ["Services nodes", `${num(result.environments.totalServicesNodes)} x Services node`],
                ["Total nodes", num(result.environments.totalNodes)],
                ["Object storage", `${num(result.environments.totalStorageTB, 1)} TB appliance`],
                ["Binding constraint", result.sizing.constraint],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className={td}>{k}</td>
                <td className={`${td} numeral text-right`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-lg">Node and VM configuration</h2>
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Role</th>
              <th className={`${th} text-right`}>vCPU</th>
              <th className={`${th} text-right`}>RAM GB</th>
              {ENVS.map((e) => (
                <th key={e} className={`${th} text-right`}>
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.environments.vms.map((v) => (
              <tr key={v.role} className="border-b border-border last:border-0">
                <td className={td}>{v.role}</td>
                <td className={`${td} numeral text-right`}>{v.vcpu}</td>
                <td className={`${td} numeral text-right`}>{num(v.ramGB)}</td>
                {ENVS.map((e) => (
                  <td key={e} className={`${td} numeral text-right`}>
                    {num(v.counts[e])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-heading text-lg">On-premise against cloud, three-year TCO</h2>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border">
              <td className={td}>On-premise</td>
              <td className={`${td} numeral text-right font-semibold text-brand`}>{inrLakh(result.cost.tco3L)}</td>
            </tr>
            {result.cloud.lines.map((l) => (
              <tr key={l.provider} className="border-b border-border last:border-0">
                <td className={td}>
                  {PROVIDER_LABEL[l.provider]}
                  <span className="ml-2 text-[11px] text-muted-foreground">{l.regionName ?? l.regionId}</span>
                </td>
                <td className={`${td} numeral text-right`}>{inrLakh(l.tco3L)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Planning estimates, not quotations. Cloud data residency follows the region shown against each provider.
        </p>
      </section>
    </div>
  );
}
