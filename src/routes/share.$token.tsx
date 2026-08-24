import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSharedScenario, scenarioTitle, type SavedScenario } from "@/lib/scenarios";
import {
  computeScenario,
  INSTANCES,
  PROVIDERS,
  PROVIDER_LABEL,
  TASKS,
  UNITS,
  type EnvName,
  type Provider,
  type ScenarioResult,
} from "@/engine";
import { inrLakh, num } from "@/lib/format";

const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
const td = "px-3 py-2 text-sm";
const ENVS: EnvName[] = ["Prod", "Dev", "UAT", "DR"];
const card = "rounded-xl border border-border bg-surface p-5";

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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 rounded-full border border-rose/40 bg-rose/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose">
      {children}
    </span>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="font-heading text-lg">{title}</h2>
      {subtitle && <p className="mb-3 mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

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

  if (state === "missing" || !row || !result) return <Revoked />;

  return <SharedTabs row={row} result={result} />;
}

function Revoked() {
  const tabs = ["Overview", "Workload", "VM configuration", "On-premise hardware", "Cloud BoQ", "TCO comparison"];
  return (
    <div className="space-y-6">
      <Brand title="Shared sizing" />
      <Tabs defaultValue={tabs[0]!}>
        <TabsList className="h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t} className="mt-6">
            <div className={card}>
              <h2 className="font-heading text-lg">This link is no longer available</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                It may have been revoked or the scenario deleted. Ask the Translab presales owner for a fresh link.
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Footer />
    </div>
  );
}

function Brand({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="rounded-xl border border-border bg-brand p-6 text-white">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/70">Tantor Gen AI Sizer · Translab Technologies</div>
      <h1 className="mt-2 font-heading text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-white/80">
        Shared read-only view. Figures in Indian rupees.{subtitle ? ` ${subtitle}` : ""}
      </p>
    </header>
  );
}

function Footer({ version }: { version?: string }) {
  return (
    <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
      Rate card version {version ?? "—"}. Planning estimates, not quotations.
    </footer>
  );
}

function SharedTabs({ row, result }: { row: SavedScenario; result: ScenarioResult }) {
  const scenario = row.data;
  const produced = new Date(row.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Brand title={scenarioTitle(row)} />
      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="vm">VM configuration</TabsTrigger>
          <TabsTrigger value="hw">On-premise hardware</TabsTrigger>
          <TabsTrigger value="cloud">Cloud bill of quantities</TabsTrigger>
          <TabsTrigger value="tco">TCO comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Overview row={row} result={result} produced={produced} />
        </TabsContent>
        <TabsContent value="workload" className="mt-6 space-y-6">
          <Workload result={result} scenario={scenario} />
        </TabsContent>
        <TabsContent value="vm" className="mt-6 space-y-6">
          <VmConfig result={result} virtualisation={scenario.virtualisation} />
        </TabsContent>
        <TabsContent value="hw" className="mt-6 space-y-6">
          <Hardware result={result} />
        </TabsContent>
        <TabsContent value="cloud" className="mt-6 space-y-6">
          <CloudBoq result={result} />
        </TabsContent>
        <TabsContent value="tco" className="mt-6 space-y-6">
          <TcoTab result={result} />
        </TabsContent>
      </Tabs>
      <Footer version={scenario.rates?.version} />
    </div>
  );
}

const CONSTRAINT_WORDS: Record<string, string> = {
  Memory: "Memory bound: the model weights and live conversation cache set the GPU count.",
  Decode: "Decode bound: the rate of tokens generated back to users sets the GPU count.",
  Prefill: "Prefill bound: the volume of prompt and document text read in sets the GPU count.",
};

function Overview({ row, result, produced }: { row: SavedScenario; result: ScenarioResult; produced: string }) {
  const estConcurrency = result.tokens.perUseCase.some((u, i) => {
    const uc = row.data.useCases[i];
    return !uc?.concurrent;
  });
  const estSizes = row.data.useCases.some((uc) => !uc.inSize || !uc.outSize);

  return (
    <>
      <Section title="Engagement">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Client", row.client || "—"],
            ["Opportunity", row.opportunity || "—"],
            ["Round", row.round || "—"],
            ["Sizing produced", produced],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Production GPUs", num(result.sizing.prodGpus)],
          ["Total nodes, all environments", num(result.environments.totalNodes)],
          ["Physical GPUs, all environments", num(result.environments.totalPhysicalGpus)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="numeral mt-1 text-2xl font-semibold text-brand">{v}</div>
          </div>
        ))}
      </div>

      <Section title="Binding constraint">
        <p className="text-sm">{CONSTRAINT_WORDS[result.sizing.constraint] ?? result.sizing.constraint}</p>
      </Section>

      <Section title="Platform selected">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Model", result.model.name],
            ["GPU", result.gpu.name],
            ["Precision", result.precision.name],
            ["Chassis", result.template.name],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="Estimated inputs"
        subtitle="Everything below was derived by the sizer rather than confirmed by the client. Please correct anything that looks wrong."
      >
        <ul className="space-y-2 text-sm">
          {result.infra.corpusEstimated && (
            <li>
              Knowledge corpus {num(result.infra.corpusGB, 1)} GB
              <Badge>Estimated</Badge>
            </li>
          )}
          {estConcurrency && (
            <li>
              Concurrent users derived from total user population for one or more use cases
              <Badge>Estimated</Badge>
            </li>
          )}
          {estSizes && (
            <li>
              Input or output sizes taken from task-type defaults for one or more use cases
              <Badge>Estimated</Badge>
            </li>
          )}
          {!result.infra.corpusEstimated && !estConcurrency && !estSizes && (
            <li className="text-muted-foreground">All sizing inputs were client-confirmed.</li>
          )}
          <li>
            Storage {num(result.environments.totalStorageTB, 1)} TB across all environments
            <Badge>Derived</Badge>
          </li>
        </ul>
      </Section>
    </>
  );
}

function Workload({ result, scenario }: { result: ScenarioResult; scenario: SavedScenario["data"] }) {
  return (
    <>
      <Section
        title="Use cases as specified"
        subtitle="The sizing was built on these figures. A wrong assumption here changes everything downstream."
      >
        <div className="space-y-4">
          {scenario.useCases.map((uc, i) => {
            const t = result.tokens.perUseCase[i];
            const task = TASKS.find((x) => x.name === uc.task);
            const unitLabel = (size?: number, unit?: string, fallbackTok?: number) =>
              size && unit ? `${num(size)} ${unit}` : `${num(fallbackTok ?? 0)} tokens (task default)`;
            return (
              <div key={uc.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{uc.name}</h3>
                  <span className="text-xs text-muted-foreground">{uc.task}</span>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Total users", uc.totalUsers ? num(uc.totalUsers) : `${num(t?.totalUsers ?? 0)} (derived)`],
                    ["Concurrent users", uc.concurrent ? num(uc.concurrent) : `${num(t?.conc ?? 0, 1)} (derived)`],
                    ["Requests per user per hour", num(uc.reqPerUserHr)],
                    ["Input size", unitLabel(uc.inSize, uc.inUnit, task?.inTok)],
                    ["Output size", unitLabel(uc.outSize, uc.outUnit, task?.outTok)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                      <dd className="numeral mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>
                {t && (
                  <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    Derived: {num(t.peakRps, 2)} peak requests per second · {num(t.prefill)} prefill tokens per second ·{" "}
                    {num(t.decode)} decode tokens per second · {num(t.inTok)} in / {num(t.outTok)} out tokens per request
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Natural units convert at {UNITS.find((u) => u.name === "Pages")?.tokens} tokens per page.
        </p>
      </Section>

      <Section title="Aggregate token rates">
        <table className="w-full">
          <tbody>
            {(
              [
                ["Peak requests per second", num(result.tokens.peakRpsTot, 2)],
                ["Prefill tokens per second", num(result.tokens.prefillTot)],
                ["Decode tokens per second", num(result.tokens.decodeTot)],
                ["Concurrent in-flight requests", num(result.tokens.inflightTot, 1)],
                ["Effective user population", num(result.tokens.effectiveTotalUsers)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className={td}>{k}</td>
                <td className={`${td} numeral text-right`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

const VM_DISK: Record<string, string> = {
  "LLM inference": "500 GB OS + 4 TB model cache",
  "Embedding service": "200 GB OS + 500 GB cache",
  "Vector database": "200 GB OS + 2 TB NVMe",
  "Kubernetes control plane": "200 GB OS",
  Observability: "200 GB OS + 2 TB logs",
  "Relational database": "200 GB OS + 1 TB NVMe",
  "Message queue": "200 GB OS + 500 GB",
  "API gateway": "150 GB OS",
  "Tantor platform": "300 GB OS + 500 GB",
};

function VmConfig({ result, virtualisation }: { result: ScenarioResult; virtualisation: boolean }) {
  return (
    <Section
      title="Virtual machine deployment plan"
      subtitle="Every VM role with its shape and its count in each environment."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Role</th>
              <th className={`${th} text-right`}>vCPU</th>
              <th className={`${th} text-right`}>RAM GB</th>
              <th className={th}>Disk</th>
              <th className={th}>GPU attach</th>
              {ENVS.map((e) => (
                <th key={e} className={`${th} text-right`}>
                  {e}
                </th>
              ))}
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {result.environments.vms.map((v) => {
              const total = ENVS.reduce((a, e) => a + v.counts[e], 0);
              const attach =
                v.role === "LLM inference"
                  ? virtualisation
                    ? "MIG partition or passthrough"
                    : "Full GPU passthrough"
                  : "None";
              return (
                <tr key={v.role} className="border-b border-border last:border-0">
                  <td className={td}>{v.role}</td>
                  <td className={`${td} numeral text-right`}>{v.vcpu}</td>
                  <td className={`${td} numeral text-right`}>{num(v.ramGB)}</td>
                  <td className={`${td} text-muted-foreground`}>{VM_DISK[v.role] ?? "200 GB OS"}</td>
                  <td className={`${td} text-muted-foreground`}>{attach}</td>
                  {ENVS.map((e) => (
                    <td key={e} className={`${td} numeral text-right`}>
                      {num(v.counts[e])}
                    </td>
                  ))}
                  <td className={`${td} numeral text-right font-semibold text-rose`}>{num(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Hardware({ result }: { result: ScenarioResult }) {
  const t = result.template;
  const g = result.gpu;
  return (
    <>
      <Section title="GPU nodes" subtitle="Configuration per node, with quantities by environment.">
        <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Chassis", t.name],
            ["CPU cores", num(t.cores)],
            ["System RAM", `${num(t.ram)} GB`],
            ["OS disk", "2 x 960 GB M.2 boot, mirrored"],
            ["Data NVMe", `${num(t.nvmeTB, 2)} TB`],
            ["Network", t.nic],
            ["GPUs per node", `${t.gpn} x ${g.name} (${g.vram} GB)`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="numeral mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Environment</th>
              <th className={`${th} text-right`}>GPU nodes</th>
              <th className={`${th} text-right`}>Physical GPUs</th>
              <th className={`${th} text-right`}>Services nodes</th>
              <th className={`${th} text-right`}>Object storage TB</th>
            </tr>
          </thead>
          <tbody>
            {result.environments.envs.map((e) => (
              <tr key={e.name} className="border-b border-border">
                <td className={td}>{e.name}</td>
                <td className={`${td} numeral text-right`}>{num(e.gpuNodes)}</td>
                <td className={`${td} numeral text-right`}>{num(e.physicalGpus)}</td>
                <td className={`${td} numeral text-right`}>{num(e.servicesNodes)}</td>
                <td className={`${td} numeral text-right`}>{num(e.storageTB, 1)}</td>
              </tr>
            ))}
            <tr>
              <td className={`${td} font-semibold`}>Total</td>
              <td className={`${td} numeral text-right font-semibold text-rose`}>
                {num(result.environments.totalGpuNodes)}
              </td>
              <td className={`${td} numeral text-right font-semibold text-rose`}>
                {num(result.environments.totalPhysicalGpus)}
              </td>
              <td className={`${td} numeral text-right font-semibold text-rose`}>
                {num(result.environments.totalServicesNodes)}
              </td>
              <td className={`${td} numeral text-right font-semibold text-rose`}>
                {num(result.environments.totalStorageTB, 1)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Services nodes" subtitle="Identical configuration across every environment.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["CPU cores", "64"],
            ["System RAM", "512 GB"],
            ["OS disk", "2 x 480 GB M.2 boot, mirrored"],
            ["Data NVMe", "7.68 TB"],
            ["Network", "2 x 25G"],
            ["GPUs per node", "None"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="numeral mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Object storage and network">
        <table className="w-full">
          <tbody>
            {(
              [
                ["Object storage appliance", `${num(result.environments.totalStorageTB, 1)} TB usable, erasure coded`],
                ["Storage protocol", "S3-compatible object over 25G Ethernet"],
                ["Node fabric", result.checks.fabricRequired ? "Dedicated GPU fabric required for multi-node model parallelism" : "Standard Ethernet fabric, no dedicated GPU fabric required"],
                ["Ethernet", `2 x 25G per node, redundant leaf-spine across ${num(result.environments.totalNodes)} nodes`],
                ["GPU interconnect", result.template.nic],
                ["Total nodes", num(result.environments.totalNodes)],
              ] as [string, string][]
            ).map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className={td}>{k}</td>
                <td className={`${td} numeral text-right`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function CloudBoq({ result }: { result: ScenarioResult }) {
  return (
    <Tabs defaultValue={PROVIDERS[0]!}>
      <TabsList className="h-auto flex-wrap">
        {PROVIDERS.map((p) => (
          <TabsTrigger key={p} value={p}>
            {PROVIDER_LABEL[p]}
          </TabsTrigger>
        ))}
      </TabsList>
      {PROVIDERS.map((p) => (
        <TabsContent key={p} value={p} className="mt-6">
          <ProviderBoq provider={p} result={result} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ProviderBoq({ provider, result }: { provider: Provider; result: ScenarioResult }) {
  const line = result.cloud.byProvider[provider];
  const map = INSTANCES[provider];
  const gpuSpec = map.gpus.find((g) => g.gpu === result.gpu.name);

  const specFor = (item: string) => {
    if (item.startsWith("GPU compute"))
      return {
        gpus: `${line.gpn} x ${result.gpu.name}`,
        vcpu: gpuSpec?.vcpu ? num(gpuSpec.vcpu) : "—",
        ram: gpuSpec?.ram ?? "—",
        storage: gpuSpec?.storage ?? "—",
        network: gpuSpec?.network ?? "—",
      };
    if (item.startsWith("Services"))
      return {
        gpus: "None",
        vcpu: num(map.services.vcpu),
        ram: map.services.ram ?? "—",
        storage: map.services.storage ?? "—",
        network: map.services.network ?? "—",
      };
    return { gpus: "—", vcpu: "—", ram: "—", storage: "—", network: "—" };
  };

  return (
    <Section
      title={`${PROVIDER_LABEL[provider]} bill of quantities`}
      subtitle={`Region ${line.regionName}${line.regionNote ? ` — ${line.regionNote}` : ""}. Configuration detail is complete enough for your cloud team to request a quotation.`}
    >
      {line.nearestEquivalent && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          {PROVIDER_LABEL[provider]} has no native instance for {result.gpu.name}; the nearest equivalent is shown.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Line</th>
              <th className={th}>Instance type</th>
              <th className={th}>GPUs</th>
              <th className={`${th} text-right`}>vCPU</th>
              <th className={th}>RAM</th>
              <th className={th}>Local storage</th>
              <th className={th}>Network</th>
              {ENVS.map((e) => (
                <th key={e} className={`${th} text-right`}>
                  {e}
                </th>
              ))}
              <th className={`${th} text-right`}>Total qty</th>
              <th className={`${th} text-right`}>Annual INR</th>
            </tr>
          </thead>
          <tbody>
            {line.boq.map((b) => {
              const s = specFor(b.item);
              return (
                <tr key={b.item} className="border-b border-border">
                  <td className={td}>{b.item}</td>
                  <td className={td}>{b.type}</td>
                  <td className={td}>{s.gpus}</td>
                  <td className={`${td} numeral text-right`}>{s.vcpu}</td>
                  <td className={td}>{s.ram}</td>
                  <td className={td}>{s.storage}</td>
                  <td className={td}>{s.network}</td>
                  {ENVS.map((e) => (
                    <td key={e} className={`${td} numeral text-right`}>
                      {b.qtyByEnv[e] === undefined ? "—" : num(b.qtyByEnv[e]!)}
                    </td>
                  ))}
                  <td className={`${td} numeral text-right`}>{num(b.qty)}</td>
                  <td className={`${td} numeral text-right`}>{inrLakh(b.annualL)}</td>
                </tr>
              );
            })}
            <tr>
              <td className={`${td} font-semibold`} colSpan={11}>
                {PROVIDER_LABEL[provider]} annual total
              </td>
              <td className={`${td} numeral text-right font-semibold text-rose`}>{inrLakh(line.boqAnnualL)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Quantities cover all four environments. Object storage and egress allowance are listed once for the estate.
      </p>
    </Section>
  );
}

function TcoTab({ result }: { result: ScenarioResult }) {
  const rows = useMemo(() => {
    const onPrem3 = result.cost.tco3L;
    const onPrem5 = result.cost.capexPayableL + 5 * result.cost.opexLyr;
    const list = [
      { key: "On-premise", three: onPrem3, five: onPrem5, onPrem: true },
      ...result.cloud.lines.map((l) => ({
        key: `${PROVIDER_LABEL[l.provider]} — ${l.regionName}`,
        three: l.tco3L,
        five: 5 * l.committedL,
        onPrem: false,
      })),
    ];
    const lowest3 = Math.min(...list.map((r) => r.three));
    return list.map((r) => ({ ...r, delta3: r.three - onPrem3, delta5: r.five - onPrem5, lowest: r.three === lowest3 }));
  }, [result]);

  const max = Math.max(...rows.map((r) => r.five));

  return (
    <>
      <Section title="Three-year and five-year totals" subtitle="All figures in Indian rupees.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Option</th>
                <th className={`${th} text-right`}>3-year TCO</th>
                <th className={`${th} text-right`}>vs on-premise</th>
                <th className={`${th} text-right`}>5-year TCO</th>
                <th className={`${th} text-right`}>vs on-premise</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <td className={td}>
                    {r.key}
                    {r.lowest && (
                      <span className="ml-2 rounded-full bg-olive/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-olive">
                        Lowest
                      </span>
                    )}
                  </td>
                  <td className={`${td} numeral text-right font-semibold`}>{inrLakh(r.three)}</td>
                  <td className={`${td} numeral text-right`}>
                    {r.onPrem ? "—" : `${r.delta3 > 0 ? "+" : ""}${inrLakh(r.delta3)}`}
                  </td>
                  <td className={`${td} numeral text-right font-semibold`}>{inrLakh(r.five)}</td>
                  <td className={`${td} numeral text-right`}>
                    {r.onPrem ? "—" : `${r.delta5 > 0 ? "+" : ""}${inrLakh(r.delta5)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Three-year against five-year">
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{r.key}</span>
                <span className="numeral text-muted-foreground">
                  3 yr {inrLakh(r.three)} · 5 yr {inrLakh(r.five)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-3 rounded bg-brand" style={{ width: `${(r.three / max) * 100}%` }} />
                <div className="h-3 rounded bg-rose" style={{ width: `${(r.five / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Purple bars are three-year totals, rose bars five-year. Cloud figures use three-year committed pricing at the
          regions selected for each provider and include the services tier. On-premise covers all four environments,
          Prod, Dev, UAT and DR.
        </p>
      </Section>

      <Section title="On-premise totals">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border">
              <td className={td}>Capital expenditure, one time</td>
              <td className={`${td} numeral text-right font-semibold text-brand`}>{inrLakh(result.cost.capexPayableL)}</td>
            </tr>
            <tr>
              <td className={td}>Operating expenditure per year</td>
              <td className={`${td} numeral text-right font-semibold text-brand`}>{inrLakh(result.cost.opexLyr)}</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </>
  );
}
