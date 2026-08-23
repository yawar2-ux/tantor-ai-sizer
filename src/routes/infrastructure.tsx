import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { num } from "@/lib/format";

export const Route = createFileRoute("/infrastructure")({
  head: () => ({
    meta: [
      { title: "Infrastructure | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Step 3: corpus, vector index, logging, storage appliances and GPU chassis templates.",
      },
      { property: "og:title", content: "Infrastructure | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Model corpus size, index RAM, retention and node chassis templates." },
    ],
  }),
  component: Infrastructure,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const labelCls = "block text-[11px] uppercase tracking-wider text-muted-foreground mb-1";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="numeral shrink-0 text-lg font-semibold text-brand">{value}</div>
    </div>
  );
}

function Infrastructure() {
  const { scenario, result, update } = useScenario();
  const { infra } = result;
  // Corpus is stored in GB on the scenario; this is display only.
  const [displayUnit, setDisplayUnit] = useState<"GB" | "TB">("GB");

  const stored = scenario.corpusGB;
  const blank = stored === undefined || stored === null || stored <= 0;
  const shown = blank ? "" : String(displayUnit === "TB" ? stored / 1024 : stored);

  const setCorpus = (raw: string) => {
    if (raw === "") return update({ corpusGB: undefined, corpusUnit: "GB" });
    const v = Number(raw);
    update({ corpusGB: displayUnit === "TB" ? v * 1024 : v, corpusUnit: "GB" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 3"
        title="Infrastructure"
        intro="Capture what the client can tell us about their corpus and retention, then review the derived retrieval and storage footprint."
      />

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Client inputs</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className={`${labelCls} mb-0`}>Corpus size</label>
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["GB", "TB"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDisplayUnit(u)}
                    className={`px-2 py-0.5 text-[11px] font-semibold ${
                      displayUnit === u ? "bg-rose text-rose-foreground" : "bg-surface text-muted-foreground"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <input
              className={`${field} ${blank ? "border-rose/50 bg-rose/5" : ""}`}
              type="number"
              min={0}
              step="any"
              placeholder="Leave blank to estimate"
              value={shown}
              onChange={(e) => setCorpus(e.target.value)}
            />
            {blank && (
              <span className="mt-2 inline-flex items-center rounded-full border border-rose/30 bg-rose/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose">
                ESTIMATED, confirm with client
              </span>
            )}
          </div>
          <div>
            <label className={labelCls}>Log retention months</label>
            <input
              className={field}
              type="number"
              min={0}
              value={scenario.retentionMonths}
              onChange={(e) => update({ retentionMonths: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={labelCls}>Model versions on disk</label>
            <input
              className={field}
              type="number"
              min={1}
              value={scenario.versions}
              onChange={(e) => update({ versions: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Corpus and retrieval</h2>
          <Row label="Corpus size" value={`${num(infra.corpusGB, 1)} GB`} />
          <Row label="Documents" value={num(infra.docs)} />
          <Row label="Vectors" value={num(infra.vectors)} />
          <Row label="Vector index RAM" value={`${num(infra.idxRAM, 1)} GB`} />
          <Row
            label="Ingestion per working day"
            value={num(infra.ingestionPerDay)}
            hint="Documents re-embedded per day; ingestion runs on the GPU nodes."
          />
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Logs and storage</h2>
          <Row label="Logs per day" value={`${num(infra.logDayGB, 1)} GB`} />
          <Row label="Logs retained" value={`${num(infra.logRetGB)} GB`} />
          <Row label="Model weights on disk" value={`${num(infra.weightsDiskGB, 1)} GB`} />
          <Row label="Appliance storage" value={`${num(infra.storageTB, 1)} TB`} />
          <p className="mt-3 text-xs text-muted-foreground">
            Object storage is appliance-based. The corpus estimate can miss badly for scanned archives, so confirm
            the real volume with the client before quoting.
          </p>
        </section>
      </div>
    </div>
  );
}
