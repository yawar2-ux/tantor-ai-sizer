import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { num } from "@/lib/format";
import { TASKS, UNITS, type UseCase } from "@/engine";

export const Route = createFileRoute("/workload")({
  head: () => ({
    meta: [
      { title: "Workload | Tantor Gen AI Sizer" },
      {
        name: "description",
        content:
          "Step 1: capture Tantor use cases, user populations, request rates and token sizes with live prefill and decode readouts.",
      },
      { property: "og:title", content: "Workload sizing | Tantor Gen AI Sizer" },
      {
        property: "og:description",
        content: "Define use cases and see peak request rates, prefill and decode token throughput update live.",
      },
    ],
  }),
  component: Workload,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const labelCls = "block text-[11px] uppercase tracking-wider text-muted-foreground mb-1";

function Workload() {
  const { scenario, result, update } = useScenario();

  const setUc = (id: string, patch: Partial<UseCase>) =>
    update({ useCases: scenario.useCases.map((u) => (u.id === id ? { ...u, ...patch } : u)) });

  const addUc = () =>
    update({
      useCases: [
        ...scenario.useCases,
        {
          id: `uc${Date.now()}`,
          name: "New use case",
          task: TASKS[0]!.name,
          totalUsers: 100,
          reqPerUserHr: 2,
        },
      ],
    });

  const removeUc = (id: string) => update({ useCases: scenario.useCases.filter((u) => u.id !== id) });

  const numOrUndef = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 1"
        title="Workload"
        intro="Describe each business use case. Leave the token sizes blank to use the task defaults, or set a size and unit to override them. Concurrency defaults to 10 per cent of the total user population."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {scenario.useCases.map((uc) => {
          const t = result.tokens.perUseCase.find((x) => x.id === uc.id)!;
          return (
            <article key={uc.id} className="card-surface p-5">
              <div className="mb-4 flex items-start gap-3">
                <input
                  className={`${field} font-heading text-base font-semibold`}
                  value={uc.name}
                  onChange={(e) => setUc(uc.id, { name: e.target.value })}
                  aria-label="Use case name"
                />
                <button
                  type="button"
                  onClick={() => removeUc(uc.id)}
                  className="shrink-0 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="col-span-2">
                  <label className={labelCls}>Task type</label>
                  <select className={field} value={uc.task} onChange={(e) => setUc(uc.id, { task: e.target.value })}>
                    {TASKS.map((t2) => (
                      <option key={t2.name} value={t2.name}>
                        {t2.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Total users</label>
                  <input
                    className={field}
                    type="number"
                    min={0}
                    value={uc.totalUsers ?? ""}
                    onChange={(e) => setUc(uc.id, { totalUsers: numOrUndef(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Concurrent override</label>
                  <input
                    className={field}
                    type="number"
                    min={0}
                    value={uc.concurrent ?? ""}
                    onChange={(e) => setUc(uc.id, { concurrent: numOrUndef(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Requests per user hour</label>
                  <input
                    className={field}
                    type="number"
                    min={0}
                    step="0.1"
                    value={uc.reqPerUserHr}
                    onChange={(e) => setUc(uc.id, { reqPerUserHr: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 grid grid-cols-[1fr_1.4fr] gap-2 md:col-span-1">
                  <div>
                    <label className={labelCls}>Input size</label>
                    <input
                      className={field}
                      type="number"
                      min={0}
                      value={uc.inSize ?? ""}
                      onChange={(e) => setUc(uc.id, { inSize: numOrUndef(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Unit</label>
                    <select
                      className={field}
                      value={uc.inUnit ?? ""}
                      onChange={(e) => setUc(uc.id, { inUnit: e.target.value || undefined })}
                    >
                      <option value="">Default</option>
                      {UNITS.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-[1fr_1.4fr] gap-2 md:col-span-1">
                  <div>
                    <label className={labelCls}>Output size</label>
                    <input
                      className={field}
                      type="number"
                      min={0}
                      value={uc.outSize ?? ""}
                      onChange={(e) => setUc(uc.id, { outSize: numOrUndef(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Unit</label>
                    <select
                      className={field}
                      value={uc.outUnit ?? ""}
                      onChange={(e) => setUc(uc.id, { outUnit: e.target.value || undefined })}
                    >
                      <option value="">Default</option>
                      {UNITS.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-background p-3 md:grid-cols-6">
                {[
                  ["Input tokens", num(t.inTok)],
                  ["Output tokens", num(t.outTok)],
                  ["Concurrent", num(t.conc)],
                  ["Peak req/s", num(t.peakRps, 3)],
                  ["Prefill tok/s", num(t.prefill)],
                  ["Decode tok/s", num(t.decode)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                    <dd className="numeral text-sm font-semibold text-brand">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addUc}
        className="rounded-lg bg-rose px-4 py-2 font-heading text-sm font-semibold text-rose-foreground transition-opacity hover:opacity-90"
      >
        Add use case
      </button>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Workload totals</h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Peak requests per second", num(result.tokens.peakRpsTot, 2)],
            ["Prefill tokens per second", num(result.tokens.prefillTot)],
            ["Decode tokens per second", num(result.tokens.decodeTot)],
            ["In-flight requests", num(result.tokens.inflightTot, 1)],
            ["Effective user population", num(result.tokens.effectiveTotalUsers)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="numeral text-xl font-semibold text-rose">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
