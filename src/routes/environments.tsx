import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { num } from "@/lib/format";
import { TEMPLATES, suggestTemplate, type EnvName } from "@/engine";

export const Route = createFileRoute("/environments")({
  head: () => ({
    meta: [
      { title: "Environments | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 4: scale Prod, Dev, UAT and DR, apply virtualisation and check services tier capacity.",
      },
      { property: "og:title", content: "Environments | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Prod, Dev, UAT and DR sizing with the VM catalogue and capacity checks." },
    ],
  }),
  component: Environments,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const labelCls = "block text-[11px] uppercase tracking-wider text-muted-foreground mb-1";

function Badge({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        ok ? "border-olive/30 bg-olive/10 text-olive" : "border-amber-500/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      {children}
    </span>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--rose)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

const ENVS: EnvName[] = ["Prod", "Dev", "UAT", "DR"];

function Environments() {
  const { scenario, result, update } = useScenario();
  const { environments, checks, template, gpu, sizing } = result;
  const suggested = suggestTemplate(gpu.name, TEMPLATES);
  const byEnv = Object.fromEntries(environments.envs.map((e) => [e.name, e])) as Record<
    EnvName,
    (typeof environments.envs)[number]
  >;

  const slider = (key: "devPct" | "uatPct" | "drPct", label: string) => (
    <div>
      <label className={labelCls}>
        {label} <span className="numeral text-rose">{Math.round(scenario[key] * 100)}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(scenario[key] * 100)}
        onChange={(e) => update({ [key]: Number(e.target.value) / 100 } as never)}
        className="w-full accent-[var(--rose)]"
      />
    </div>
  );

  const rows: Array<[string, (e: (typeof environments.envs)[number]) => number, number]> = [
    ["GPUs logical", (e) => e.logicalGpus, environments.envs.reduce((a, e) => a + e.logicalGpus, 0)],
    ["GPUs physical", (e) => e.physicalGpus, environments.totalPhysicalGpus],
    ["GPU nodes", (e) => e.gpuNodes, environments.totalGpuNodes],
    ["Vector DB nodes", (e) => e.vectorNodes, environments.envs.reduce((a, e) => a + e.vectorNodes, 0)],
    ["Platform nodes", (e) => e.platformNodes, environments.envs.reduce((a, e) => a + e.platformNodes, 0)],
    ["Data services nodes", (e) => e.dataNodes, environments.envs.reduce((a, e) => a + e.dataNodes, 0)],
    ["Services nodes total", (e) => e.servicesNodes, environments.totalServicesNodes],
    ["Total nodes", (e) => e.gpuNodes + e.servicesNodes, environments.totalNodes],
    ["Storage TB", (e) => e.storageTB, environments.totalStorageTB],
  ];

  const gpuRam = Math.max(template.ram, checks.ramReq);
  const services = TEMPLATES.find((t) => t.name === "Services node")!;
  const nic = `${template.nic}${checks.fabricRequired ? " + 400G IB/RoCE" : ""}`;

  const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
  const td = "px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 4"
        title="Environments"
        intro="Scale the non-production environments, choose DR high availability and confirm the chassis that carries the build."
      />

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Environment policy</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {slider("devPct", "Dev")}
          {slider("uatPct", "UAT")}
          {slider("drPct", "DR")}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle
            label="DR high availability"
            checked={scenario.drHA}
            onChange={(v) => update({ drHA: v })}
            hint="Adds spare GPUs and duplicates the services tier in DR."
          />
          <Toggle
            label="Production HA replica"
            checked={scenario.haEnabled ?? true}
            onChange={(v) => update({ haEnabled: v })}
            hint={`Adds one spare replica (${sizing.replicaGpus} GPU${sizing.replicaGpus === 1 ? "" : "s"}) to production. Turn off for a pilot.`}
          />
          <Toggle
            label="GPU virtualisation for Dev and UAT"
            checked={scenario.virtualisation}
            onChange={(v) => update({ virtualisation: v })}
            hint={`${scenario.rates.migPartitions} partitions per GPU`}
          />
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Chassis template</h2>
          <div className="flex flex-wrap gap-2">
            <Badge ok={checks.ramOk}>{checks.ramOk ? "RAM OK" : `RAM low, needs ${Math.round(checks.ramReq)} GB`}</Badge>
            <Badge ok={checks.nvmeOk}>{checks.nvmeOk ? "NVMe OK" : "NVMe too small for weights"}</Badge>
            <Badge ok={!checks.fabricRequired}>
              {checks.fabricRequired ? "Fabric required, multi-node model" : "No fabric required"}
            </Badge>
          </div>
        </div>

        {checks.mismatch && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            MISMATCH: {gpu.name} is not compatible with the {template.name} chassis. Suggested: {suggested.name}.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Template</label>
            <select
              className={field}
              value={scenario.template ?? suggested.name}
              onChange={(e) => update({ template: e.target.value })}
            >
              {TEMPLATES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Suggested for {gpu.name}: {suggested.name}</p>
          </div>
          <dl className="grid grid-cols-3 gap-3 rounded-lg bg-background p-3">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">GPUs per node</dt>
              <dd className="numeral text-lg font-semibold text-brand">{template.gpn}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Weights GB</dt>
              <dd className="numeral text-lg font-semibold text-brand">{num(sizing.weights, 1)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Node watts</dt>
              <dd className="numeral text-lg font-semibold text-brand">{num(template.watts)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="card-surface overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">Environment matrix</h2>
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Metric</th>
              {ENVS.map((e) => (
                <th key={e} className={`${th} text-right`}>
                  {e}
                </th>
              ))}
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, get, total]) => (
              <tr key={label} className="border-b border-border last:border-0">
                <td className={td}>{label}</td>
                {ENVS.map((e) => (
                  <td key={e} className={`${td} numeral text-right`}>
                    {num(get(byEnv[e]), label === "Storage TB" ? 1 : 0)}
                  </td>
                ))}
                <td className={`${td} numeral text-right font-semibold text-rose`}>
                  {num(total, label === "Storage TB" ? 1 : 0)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className={td}>Capacity check</td>
              {ENVS.map((e) => (
                <td key={e} className={`${td} text-right`}>
                  <Badge ok={byEnv[e].capacityPass}>{byEnv[e].capacityPass ? "PASS" : "REVIEW"}</Badge>
                </td>
              ))}
              <td className={td} />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card-surface overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">Server configuration</h2>
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["Role", "Cores", "RAM GB", "OS disk", "Data NVMe", "Network", "GPU loadout", "Nodes"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className={td}>GPU node ({template.name})</td>
              <td className={`${td} numeral`}>{template.cores}</td>
              <td className={`${td} numeral`}>{num(gpuRam)}</td>
              <td className={td}>2x 960GB RAID1</td>
              <td className={`${td} numeral`}>{num(template.nvmeTB, 2)} TB</td>
              <td className={td}>{nic}</td>
              <td className={td}>
                {template.gpn} x {gpu.name}
              </td>
              <td className={`${td} numeral`}>{num(environments.totalGpuNodes)}</td>
            </tr>
            <tr className="border-b border-border">
              <td className={td}>Services node</td>
              <td className={`${td} numeral`}>{services.cores}</td>
              <td className={`${td} numeral`}>{num(services.ram)}</td>
              <td className={td}>2x 960GB RAID1</td>
              <td className={`${td} numeral`}>{num(services.nvmeTB, 2)} TB</td>
              <td className={td}>{services.nic}</td>
              <td className={td}>None</td>
              <td className={`${td} numeral`}>{num(environments.totalServicesNodes)}</td>
            </tr>
            <tr>
              <td className={td}>Object storage appliance</td>
              <td className={td} colSpan={5}>
                {ENVS.map((e) => `${e} ${num(byEnv[e].storageTB, 1)} TB`).join(", ")}
              </td>
              <td className={td}>Appliance based</td>
              <td className={`${td} numeral`}>{num(environments.totalStorageTB, 1)} TB</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
