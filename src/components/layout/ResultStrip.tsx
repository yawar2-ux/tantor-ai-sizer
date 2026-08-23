import { useScenario } from "@/state/scenario";
import { inrLakh, inrPlain, num } from "@/lib/format";
import { PROVIDER_LABEL } from "@/engine";

function Cell({ label, value, tone }: { label: string; value: string; tone?: "rose" | "olive" | "info" | undefined }) {
  const toneClass =
    tone === "rose" ? "text-rose" : tone === "olive" ? "text-olive" : tone === "info" ? "text-info" : "text-brand";
  return (
    <div className="min-w-0 px-4 py-2">
      <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`numeral truncate text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function ResultStrip() {
  const { result } = useScenario();
  const { sizing, environments, cost, cloud } = result;
  const delta = cloud.bestTco3L - cost.tco3L;

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4 xl:grid-cols-7">
        <Cell label="Production GPUs" value={num(sizing.prodGpus)} tone="rose" />
        <Cell label="All-env physical GPUs" value={num(environments.totalPhysicalGpus)} />
        <Cell label="Total nodes" value={num(environments.totalNodes)} />
        <Cell label="Binding constraint" value={sizing.constraint} tone="info" />
        <Cell label="On-premise 3-year TCO" value={inrLakh(cost.tco3L)} tone="rose" />
        <Cell
          label={`Delta vs ${PROVIDER_LABEL[cloud.bestProvider]}`}
          value={`${delta >= 0 ? "saves " : "costs "}${inrLakh(Math.abs(delta))}`}
          tone={delta >= 0 ? "olive" : undefined}
        />
        <Cell label="INR per million tokens" value={inrPlain(cost.perMTok, 2)} />
      </div>
    </div>
  );
}
