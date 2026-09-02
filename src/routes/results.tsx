import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { usePresentation } from "@/state/presentation";
import { inrLakh, inrPlain, num } from "@/lib/format";
import { exportExcel, exportScenarioJson } from "@/lib/export";
import { logSizing } from "@/lib/analytics";
import { SharePanel } from "@/components/results/SharePanel";
import {
  BreakEvenPanel,
  PhasedPanel,
  RackPowerPanel,
  SensitivityPanel,
} from "@/components/results/AnalysisPanels";
import {
  PROVIDERS,
  PROVIDER_LABEL,
  REGIONS,
  type EnvName,
  type Provider,
} from "@/engine";


export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 5: on-premise bill of quantities, three-year TCO in INR and cloud comparison.",
      },
      { property: "og:title", content: "Results | Tantor Gen AI Sizer" },
      { property: "og:description", content: "On-premise capex, opex and cloud comparison, all in Indian rupees." },
    ],
  }),
  component: Results,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
const td = "px-3 py-2 text-sm";
const ENVS: EnvName[] = ["Prod", "Dev", "UAT", "DR"];

function crore(lakh: number) {
  return `₹${num(lakh, 2)} L (₹${num(lakh / 100, 2)} Cr)`;
}

function Results() {
  const { scenario, result, update } = useScenario();
  const { presenting } = usePresentation();

  const { cost, cloud, environments, sizing, model, gpu, precision, template } = result;
  const [tab, setTab] = useState<Provider>(cloud.bestProvider);

  // Usage analytics: one log line per distinct sizing viewed on this page.
  const logged = useRef<string>("");
  useEffect(() => {
    const key = `${model.name}|${gpu.name}|${precision.name}|${sizing.prodGpus}`;
    if (logged.current === key) return;
    logged.current = key;
    void logSizing({
      model: model.name,
      gpu: gpu.name,
      precision: precision.name,
      prodGpus: sizing.prodGpus,
      tco3L: cost.tco3L,
    });
  }, [model.name, gpu.name, precision.name, sizing.prodGpus, cost.tco3L]);

  const bars = [
    { label: "On-premise", value: cost.tco3L, kind: "onprem" as const },
    ...cloud.lines.map((l) => ({ label: PROVIDER_LABEL[l.provider], value: l.tco3L, kind: "cloud" as const })),
  ];
  const max = Math.max(...bars.map((b) => b.value));
  const bestValue = Math.min(...bars.map((b) => b.value));

  const setRegion = (p: Provider, id: string) =>
    update({ cloudRegions: { ...(scenario.cloudRegions ?? {}), [p]: id } });

  const boq = cloud.byProvider[tab];

  const buildUp: [string, number][] = [
    ["Chassis", cost.chassisL],
    ["GPU cards", cost.cardsL],
    ["Services nodes", cost.servicesL],
    ["Storage appliance", cost.storageL],
    ...(cost.ancillaryGpus > 0
      ? ([[`Ancillary models (${cost.ancillaryGpus} x L40S)`, cost.ancillaryL]] as [string, number][])
      : []),
    ["Network (ethernet + fabric)", cost.ethernetL + cost.fabricL],
    ["Installation", cost.installL],
    ["Implementation", cost.implOneL],
    ["Contingency", cost.contingencyL],
  ];
  const licencesL =
    scenario.rates.nvaieLperGpu * environments.totalPhysicalGpus +
    scenario.rates.k8sLicLperNode * environments.totalNodes;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 5"
        title="Results"
        intro="Three-year cost of the Tantor build against public cloud, with the bill of quantities, cloud BOQ and the client pack comparison."
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => exportExcel(scenario, result)}
          className="rounded-lg bg-rose px-4 py-2 font-heading text-sm font-semibold text-rose-foreground transition-opacity hover:opacity-90"
        >
          Export Excel pack
        </button>
        <SharePanel />
        <button
          type="button"
          onClick={() => exportScenarioJson(scenario)}
          className="rounded-lg border border-border px-4 py-2 font-heading text-sm font-semibold text-brand transition-colors hover:border-rose"
        >
          Export scenario JSON
        </button>
      </div>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Cloud regions, per provider</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROVIDERS.map((p) => {
            const line = cloud.byProvider[p];
            return (
              <div key={p} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-heading text-sm font-semibold">{PROVIDER_LABEL[p]}</span>
                  <span className="numeral inline-flex items-center rounded-full border border-rose/30 bg-rose/10 px-2 py-0.5 text-[11px] font-semibold text-rose">
                    x{line.mult.toFixed(2)}
                  </span>
                </div>
                <select
                  className={field}
                  value={line.regionId}
                  onChange={(e) => setRegion(p, e.target.value)}
                >
                  {REGIONS[p].map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">{line.regionNote}</p>
                {!presenting && (
                  <p className="numeral mt-2 text-sm font-semibold text-brand">
                    {inrPlain(line.inrPerGpuHr, 2)} per GPU-hour
                    <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                      list ${line.usdPerGpuHr.toFixed(2)}
                    </span>
                  </p>
                )}

              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cloud data residency follows the region selected per provider; on-premise data stays in the client data
          centre.
          {!presenting && (
            <>
              {" "}
              Cloud rates are USD-denominated and converted at {scenario.rates.fx} INR per USD, so the rupee bill moves
              with the exchange rate.
            </>
          )}
        </p>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Three-year TCO</h2>
        <div className="space-y-3">
          {bars.map((b) => {
            const best = b.value === bestValue;
            const color = best ? "var(--rose)" : b.kind === "onprem" ? "var(--brand)" : "oklch(0.78 0.06 305)";
            return (
              <div key={b.label} className="grid grid-cols-[110px_1fr_190px] items-center gap-3">
                <span className="truncate text-sm">{b.label}</span>
                <div className="h-6 rounded-md bg-background">
                  <div
                    className="h-6 rounded-md"
                    style={{ width: `${Math.max(2, (b.value / max) * 100)}%`, backgroundColor: color }}
                  />
                </div>
                <span className={`numeral text-right text-sm font-semibold ${best ? "text-rose" : "text-brand"}`}>
                  {crore(b.value)}
                </span>
              </div>
            );
          })}
        </div>
        {!presenting && (
          <p className="mt-3 text-xs text-muted-foreground">
            Cloud lines are committed-use estimates at each provider&apos;s selected region multiplier, converted at{" "}
            {scenario.rates.fx} INR per USD.
          </p>
        )}

      </section>

      <SensitivityPanel scenario={scenario} />
      <BreakEvenPanel scenario={scenario} />
      <RackPowerPanel result={result} />
      <PhasedPanel result={result} hideMoney={presenting} />



      <div className="grid gap-5 xl:grid-cols-2">
        {!presenting && (
        <section className="card-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">On-premise cost build-up</h2>

          <table className="w-full">
            <tbody>
              {buildUp.map(([k, v]) => (
                <tr key={k} className="border-b border-border">
                  <td className={td}>{k}</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(v)}</td>
                </tr>
              ))}
              <tr className="border-b border-border">
                <td className={`${td} font-semibold`}>Capex (list)</td>
                <td className={`${td} numeral text-right font-semibold`}>{inrLakh(cost.capexL)}</td>
              </tr>
              {cost.discountL > 0 && (
                <tr className="border-b border-border">
                  <td className={td}>Negotiated discount</td>
                  <td className={`${td} numeral text-right`}>− {inrLakh(cost.discountL)}</td>
                </tr>
              )}
              {cost.gstL > 0 && (
                <tr className="border-b border-border">
                  <td className={td}>GST</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(cost.gstL)}</td>
                </tr>
              )}
              <tr className="border-b border-border">
                <td className={`${td} font-semibold`}>Capex payable</td>
                <td className={`${td} numeral text-right font-semibold text-rose`}>{inrLakh(cost.capexPayableL)}</td>
              </tr>
              {cost.licenceLyr > 0 && (
                <tr className="border-b border-border">
                  <td className={td}>Tantor licence per year</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(cost.licenceLyr)}</td>
                </tr>
              )}
              {cost.supportLyr > 0 && (
                <tr className="border-b border-border">
                  <td className={td}>Tantor support per year</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(cost.supportLyr)}</td>
                </tr>
              )}
              <tr className="border-b border-border">
                <td className={td}>Power per year</td>
                <td className={`${td} numeral text-right`}>{inrLakh(cost.powerLyr)}</td>
              </tr>
              {licencesL > 0 && (
                <tr className="border-b border-border">
                  <td className={td}>Licences per year</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(licencesL)}</td>
                </tr>
              )}
              <tr className="border-b border-border">
                <td className={td}>Opex per year (all in)</td>
                <td className={`${td} numeral text-right`}>{inrLakh(cost.opexLyr)}</td>
              </tr>
              <tr>
                <td className={`${td} font-semibold`}>Three-year TCO</td>
                <td className={`${td} numeral text-right font-semibold text-rose`}>{crore(cost.tco3L)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        )}


        <section className="card-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Bill of materials summary</h2>
          <table className="w-full">
            <tbody>
              {(
                [
                  ["Model / precision", `${model.name}, ${precision.name}`],
                  ["GPU cards", `${num(environments.totalPhysicalGpus)} x ${gpu.name}`],
                  ["GPU nodes", `${num(environments.totalGpuNodes)} x ${template.name}`],
                  ["Services nodes", `${num(environments.totalServicesNodes)} x Services node`],
                  ["Total nodes", num(environments.totalNodes)],
                  ["Object storage", `${num(environments.totalStorageTB, 1)} TB appliance`],
                  ["Binding constraint", sizing.constraint],
                  ["INR per million tokens", inrPlain(cost.perMTok, 2)],
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
      </div>

      <section className="card-surface overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">VM deployment</h2>
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
            {environments.vms.map((v) => (
              <tr key={v.role} className="border-b border-border">
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
            <tr>
              <td className={td} colSpan={3}>
                Services tier capacity
              </td>
              {ENVS.map((e) => {
                const env = environments.envs.find((x) => x.name === e)!;
                return (
                  <td key={e} className={`${td} text-right`}>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        env.capacityPass
                          ? "border-olive/30 bg-olive/10 text-olive"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }`}
                    >
                      {env.capacityPass ? "PASS" : "REVIEW"}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      {!presenting && (
      <section className="card-surface p-5">

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Cloud bill of quantities</h2>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTab(p)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  tab === p ? "bg-rose text-rose-foreground" : "text-muted-foreground"
                }`}
              >
                {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {boq.nearestEquivalent && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
            <div className="font-semibold">
              {gpu.name}: no native instance on {PROVIDER_LABEL[tab]}; nearest equivalent.
            </div>
            <input
              className={`${field} mt-2`}
              value={scenario.instanceOverrides?.[tab] ?? ""}
              placeholder="Enter the nearest equivalent instance type"
              onChange={(e) =>
                update({ instanceOverrides: { ...(scenario.instanceOverrides ?? {}), [tab]: e.target.value } })
              }
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Line item</th>
                <th className={th}>Instance type</th>
                <th className={th}>Region</th>
                {ENVS.map((e) => (
                  <th key={e} className={`${th} text-right`}>
                    {e}
                  </th>
                ))}
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>INR per hour</th>
                <th className={`${th} text-right`}>Monthly L</th>
                <th className={`${th} text-right`}>Annual L</th>
              </tr>
            </thead>
            <tbody>
              {boq.boq.map((l) => (
                <tr key={l.item} className="border-b border-border">
                  <td className={td}>{l.item}</td>
                  <td className={td}>{l.type}</td>
                  <td className={td}>{l.region}</td>
                  {ENVS.map((e) => (
                    <td key={e} className={`${td} numeral text-right`}>
                      {l.qtyByEnv[e] === undefined ? "—" : num(l.qtyByEnv[e]!)}
                    </td>
                  ))}
                  <td className={`${td} numeral text-right`}>{num(l.qty)}</td>
                  <td className={`${td} numeral text-right`}>
                    {inrPlain(l.unitInrHr, 2)}
                    <span className="ml-1 block text-[10px] font-normal text-muted-foreground">
                      list ${l.usdRef.toFixed(2)}
                    </span>
                  </td>
                  <td className={`${td} numeral text-right`}>{num(l.monthlyL, 2)}</td>
                  <td className={`${td} numeral text-right`}>{num(l.annualL, 2)}</td>
                </tr>
              ))}
              <tr>
                <td className={`${td} font-semibold`} colSpan={9}>
                  Annual total, {PROVIDER_LABEL[tab]} {boq.regionName}
                </td>
                <td className={`${td} numeral text-right font-semibold text-rose`}>{num(boq.boqAnnualL, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          On-demand annual {inrLakh(boq.annualOnDemandL)}, committed annual {inrLakh(boq.committedL)}, three-year{" "}
          {crore(boq.tco3L)}. USD list rates are a secondary reference only; quote the INR figures.
        </p>
      </section>
      )}


    </div>
  );
}
