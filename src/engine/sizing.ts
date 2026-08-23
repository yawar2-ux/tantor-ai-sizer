import type { Gpu, Model, Precision, Rates } from "./types";
import type { TokenTotals } from "./tokens";

export interface SizingResult {
  decodeTps: number;
  weights: number;
  kvTot: number;
  memGpus: number;
  decGpus: number;
  preGpus: number;
  base: number;
  constraint: "Memory" | "Decode" | "Prefill";
  withHead: number;
  withAnc: number;
  withSched: number;
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
): SizingResult {
  const decodeTps = ((gpu.idx * rates.calibK) / model.activeB) * precision.tput;
  const weights = model.totalB * precision.bytes * rates.weightOverhead;
  const kvTot = (tot.inflightTot * tot.avgTok) / 1000 * model.kv1k;
  const memGpus = Math.ceil((weights + kvTot) / (gpu.vram * gpu.usable));
  const decGpus = Math.ceil(tot.decodeTot / (decodeTps * rates.servingEff));
  const preGpus = Math.ceil(tot.prefillTot / (decodeTps * rates.prefillMult * rates.servingEff));
  const base = Math.max(memGpus, decGpus, preGpus);
  const constraint: SizingResult["constraint"] =
    base === memGpus ? "Memory" : base === decGpus ? "Decode" : "Prefill";

  const withHead = Math.ceil(base * (1 + rates.headroom));
  const withAnc = Math.ceil(withHead * (1 + rates.ancillary));
  const withSched = Math.ceil(withAnc * (1 + rates.schedOverhead));
  const prodGpus = withSched + rates.haGpus;

  const ttftMs =
    tot.peakRpsTot > 0 ? (tot.prefillTot / tot.peakRpsTot / (decodeTps * rates.prefillMult)) * 1000 : 0;
  const tpotMs = 1000 / (decodeTps / rates.streamsPerGpu);

  return {
    decodeTps,
    weights,
    kvTot,
    memGpus,
    decGpus,
    preGpus,
    base,
    constraint,
    withHead,
    withAnc,
    withSched,
    prodGpus,
    ttftMs,
    ttftPass: ttftMs <= ttftTargetMs,
    tpotMs,
    tpotPass: tpotMs <= tpotTargetMs,
  };
}
