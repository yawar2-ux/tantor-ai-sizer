import type { ScenarioResult } from "@/engine";
import { inrLakh, num } from "@/lib/format";

export interface Headline {
  label: string;
  value: number;
  display: string;
  /** Lower is better for costs, higher is better for capacity headroom. */
  betterWhenLower: boolean;
}

export function headlines(r: ScenarioResult): Headline[] {
  const money = (v: number) => inrLakh(v);
  return [
    { label: "Production GPUs", value: r.sizing.prodGpus, display: num(r.sizing.prodGpus), betterWhenLower: true },
    {
      label: "All-env physical GPUs",
      value: r.environments.totalPhysicalGpus,
      display: num(r.environments.totalPhysicalGpus),
      betterWhenLower: true,
    },
    { label: "Total nodes", value: r.environments.totalNodes, display: num(r.environments.totalNodes), betterWhenLower: true },
    {
      label: "Storage",
      value: r.environments.totalStorageTB,
      display: `${num(r.environments.totalStorageTB, 1)} TB`,
      betterWhenLower: true,
    },
    { label: "Capex", value: r.cost.capexL, display: money(r.cost.capexL), betterWhenLower: true },
    { label: "Opex per year", value: r.cost.opexLyr, display: money(r.cost.opexLyr), betterWhenLower: true },
    { label: "On-premise 3-year TCO", value: r.cost.tco3L, display: money(r.cost.tco3L), betterWhenLower: true },
    { label: "Best cloud 3-year TCO", value: r.cloud.bestTco3L, display: money(r.cloud.bestTco3L), betterWhenLower: true },
    { label: "TTFT estimate", value: r.sizing.ttftMs, display: `${num(r.sizing.ttftMs)} ms`, betterWhenLower: true },
    { label: "TPOT estimate", value: r.sizing.tpotMs, display: `${num(r.sizing.tpotMs, 1)} ms`, betterWhenLower: true },
  ];
}

export function deltaChip(a: number, b: number, betterWhenLower: boolean) {
  const diff = b - a;
  const pct = a === 0 ? 0 : (diff / a) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "" : "±";
  const tone = diff === 0 ? "flat" : (diff < 0) === betterWhenLower ? "good" : "bad";
  return { diff, pct, label: `${sign}${pct.toFixed(1)}%`, tone } as const;
}
