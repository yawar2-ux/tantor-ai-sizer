import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { num } from "@/lib/format";
import { GPUS, MODELS, PRECISIONS } from "@/engine";

export const Route = createFileRoute("/model-platform")({
  head: () => ({
    meta: [
      { title: "Model & Platform | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 2: pick the open-weight model, GPU and serving precision for the Tantor deployment.",
      },
      { property: "og:title", content: "Model and platform | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Choose model, GPU and precision, and check TTFT and TPOT targets." },
    ],
  }),
  component: ModelPlatform,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const labelCls = "block text-[11px] uppercase tracking-wider text-muted-foreground mb-1";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rose" | "brand" }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`numeral text-lg font-semibold ${tone === "rose" ? "text-rose" : "text-brand"}`}>{value}</dd>
    </div>
  );
}

function AvailBadge({ avail }: { avail: string }) {
  const ga = /^GA$/i.test(avail);
  const limited = /limited/i.test(avail);
  const cls = ga
    ? "bg-olive/10 text-olive border-olive/30"
    : limited
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {avail}
    </span>
  );
}

function Verdict({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        pass
          ? "border-olive/30 bg-olive/10 text-olive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      {pass ? "PASS" : "REVIEW"}
    </span>
  );
}

function ModelPlatform() {
  const { scenario, result, update } = useScenario();
  const { sizing, model, gpu, precision } = result;

  const chain = [
    ["Memory floor (replica)", sizing.replicaGpus],
    ["Throughput with headroom", sizing.throughputGpus],
    ["Base", sizing.base],
    ...(sizing.schedApplied ? ([["+ Fragmentation allowance", sizing.withSched]] as const) : []),
    [sizing.haEnabled ? "+ HA replica" : "No HA replica", sizing.prodGpus],
  ] as [string, number][];

  const replicaLabel = `1 replica = ${sizing.replicaGpus} x ${gpu.name.replace(/^NVIDIA |^AMD /, "")}`;

  const remediation = "Try a faster GPU, lower precision, fewer streams per GPU, or a shorter context.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 2"
        title="Model & Platform"
        intro="Choose the open-weight model, GPU and serving precision, then check the sizing chain and latency targets."
      />

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Platform selection</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Model</label>
            <select className={field} value={scenario.model} onChange={(e) => update({ model: e.target.value })}>
              {MODELS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground numeral">
              {num(model.totalB, 1)}B total / {num(model.activeB, 1)}B active / KV {num(model.kv1k, 2)} GB per 1k tok
            </p>
          </div>
          <div>
            <label className={labelCls}>GPU</label>
            <select className={field} value={scenario.gpu} onChange={(e) => update({ gpu: e.target.value })}>
              {GPUS.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <AvailBadge avail={gpu.avail} />
              <span className="numeral text-xs text-muted-foreground">
                {num(gpu.vram)} GB VRAM, {Math.round(gpu.usable * 100)}% usable
              </span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Precision</label>
            <select
              className={field}
              value={scenario.precision}
              onChange={(e) => update({ precision: e.target.value })}
            >
              {PRECISIONS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 numeral text-xs text-muted-foreground">
              {precision.bytes} bytes per parameter, throughput factor {precision.tput}
            </p>
          </div>
          <div>
            <label className={labelCls}>Ancillary models</label>
            <select
              className={field}
              value={scenario.ancillaryMode ?? "none"}
              onChange={(e) => update({ ancillaryMode: e.target.value as "none" | "mig" | "l40s" })}
            >
              <option value="none">None</option>
              <option value="mig">Shared MIG slice</option>
              <option value="l40s">Dedicated L40S</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Embedding, rerank and guardrail models. Dedicated adds one L40S per environment as a separate BOM line;
              a shared MIG slice and None add no cards.
            </p>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Sizing</h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Decode tok/s per GPU" value={num(sizing.decodeTps)} />
          <Stat label="Weights GB" value={num(sizing.weights, 1)} />
          <Stat label="KV cache total GB" value={num(sizing.kvTot, 1)} />
          <Stat label="Binding constraint" value={sizing.constraint} tone="rose" />
        </dl>

        <div className="mt-5 grid grid-cols-3 gap-4 rounded-lg bg-background p-4">
          {[
            ["Memory GPUs", sizing.memGpus, "Memory"],
            ["Decode GPUs", sizing.decGpus, "Decode"],
            ["Prefill GPUs", sizing.preGpus, "Prefill"],
          ].map(([label, value, name]) => (
            <div key={String(label)}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{String(label)}</dt>
              <dd
                className={`numeral text-xl font-semibold ${
                  sizing.constraint === name ? "text-rose" : "text-brand"
                }`}
              >
                {num(Number(value))}
              </dd>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Scaling chain</h3>
            <span className="numeral rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
              {replicaLabel}
            </span>
          </div>
          <ol className="flex flex-wrap items-center gap-2">
            {chain.map(([label, value], i) => {
              const last = i === chain.length - 1;
              return (
                <li key={label} className="flex items-center gap-2">
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      last ? "border-rose/40 bg-rose/10" : "border-border bg-surface"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className={`numeral text-lg font-semibold ${last ? "text-rose" : "text-brand"}`}>
                      {num(value)}
                    </div>
                  </div>
                  {!last && <span className="text-muted-foreground">&rarr;</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Latency targets</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Time to first token</h3>
              <Verdict pass={sizing.ttftPass} />
            </div>
            <label className={labelCls}>Target ms</label>
            <input
              className={field}
              type="number"
              min={0}
              value={scenario.ttftTargetMs}
              onChange={(e) => update({ ttftTargetMs: Number(e.target.value) })}
            />
            <p className="mt-3 numeral text-2xl font-semibold text-brand">{num(sizing.ttftMs)} ms</p>
            {!sizing.ttftPass && <p className="mt-2 text-xs text-amber-700">{remediation}</p>}
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Time per output token</h3>
              <Verdict pass={sizing.tpotPass} />
            </div>
            <label className={labelCls}>Target ms</label>
            <input
              className={field}
              type="number"
              min={0}
              value={scenario.tpotTargetMs}
              onChange={(e) => update({ tpotTargetMs: Number(e.target.value) })}
            />
            <p className="mt-3 numeral text-2xl font-semibold text-brand">{num(sizing.tpotMs, 1)} ms</p>
            {!sizing.tpotPass && <p className="mt-2 text-xs text-amber-700">{remediation}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
