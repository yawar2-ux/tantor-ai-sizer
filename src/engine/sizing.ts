import type { Gpu, Model, Precision, Rates } from "./types";
import type { TokenTotals } from "./tokens";

/** Round `n` up to the nearest multiple of `step` (replica granularity). */
function ceilTo(n: number, step: number): number {
  if (step <= 0) return Math.ceil(n);
  return Math.ceil(n / step) * step;
}

export interface SizingResult {
  decodeTps: number;
  weights: number;
  kvTot: number;
  /** GPUs one copy (replica) of the model needs: the memory floor. */
  replicaGpus: number;
  memGpus: number;
  decGpus: number;
  preGpus: number;
  /** max(decode, prefill) rounded up to whole replicas. */
  throughputGpus: number;
  base: number;
  constraint: "Memory" | "Decode" | "Prefill";
  /** Base plus fleet fragmentation allowance, rounded up to whole replicas. Equals base when the allowance is 0. */
  withSched: number;
  /** True when a non-zero fragmentation allowance changed the count. */
  schedApplied: boolean;
  haEnabled: boolean;
  prodGpus: number;
  ttftMs: number;
  ttftPass: boolean;
  tpotMs: number;
  tpotPass: boolean;
}

export function computeSizing(
  tot: TokenTotals,
  model: Model,
  gpu: Gpu,
  precision: Precision,
  rates: Rates,
  ttftTargetMs: number,
  tpotTargetMs: number,
  haEnabled = true,
): SizingResult {
  const decodeTps = ((gpu.idx * rates.calibK) / model.activeB) * precision.tput;
  const weights = model.totalB * precision.bytes * rates.weightOverhead;
  const kvTot = ((tot.inflightTot * tot.avgTok) / 1000) * model.kv1k;

  // 1. Memory floor: one replica.
  const replicaGpus = Math.max(1, Math.ceil((weights + kvTot) / (gpu.vram * gpu.usable)));

  // 2. Headroom applied to demand, not to the GPU count.
  const uplift = 1 + rates.headroom;
  const decodeDemand = tot.decodeTot * uplift;
  const prefillDemand = tot.prefillTot * uplift;
  const decGpus = Math.ceil(decodeDemand / (decodeTps * rates.servingEff));
  const preGpus = Math.ceil(prefillDemand / (decodeTps * rates.prefillMult * rates.servingEff));

  // 3. Throughput requirement in whole replicas.
  const throughputRaw = Math.max(decGpus, preGpus);
  const throughputGpus = ceilTo(throughputRaw, replicaGpus);

  // 4. Base and binding constraint.
  const base = Math.max(replicaGpus, throughputGpus);
  const constraint: SizingResult["constraint"] =
    throughputGpus > replicaGpus ? (decGpus >= preGpus ? "Decode" : "Prefill") : "Memory";

  // 5. Fleet fragmentation allowance, skipped entirely when zero.
  const schedApplied = (rates.schedOverhead ?? 0) > 0;
  const withSched = schedApplied ? ceilTo(base * (1 + rates.schedOverhead), replicaGpus) : base;

  // 6. HA adds one replica, never one GPU.
  const prodGpus = withSched + (haEnabled ? replicaGpus : 0);

  const ttftMs =
    tot.peakRpsTot > 0 ? (tot.prefillTot / tot.peakRpsTot / (decodeTps * rates.prefillMult)) * 1000 : 0;
  const tpotMs = 1000 / (decodeTps / rates.streamsPerGpu);

  return {
    decodeTps,
    weights,
    kvTot,
    replicaGpus,
    memGpus: replicaGpus,
    decGpus,
    preGpus,
    throughputGpus,
    base,
    constraint,
    withSched,
    schedApplied,
    haEnabled,
    prodGpus,
    ttftMs,
    ttftPass: ttftMs <= ttftTargetMs,
    tpotMs,
    tpotPass: tpotMs <= tpotTargetMs,
  };
}
