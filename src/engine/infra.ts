import type { Gpu, Rates, Template } from "./types";
import type { TokenTotals } from "./tokens";

export const ceilHalf = (n: number) => Math.ceil(n * 2) / 2;

export interface InfraResult {
  corpusGB: number;
  corpusEstimated: boolean;
  docs: number;
  vectors: number;
  idxRAM: number;
  ingestionPerDay: number;
  logDayGB: number;
  logRetGB: number;
  weightsDiskGB: number;
  storageTB: number;
}

export function computeInfra(
  tot: TokenTotals,
  rates: Rates,
  weights: number,
  opts: { corpusGB?: number | undefined; retentionMonths: number; versions: number },
): InfraResult {
  const corpusEstimated = opts.corpusGB === undefined || opts.corpusGB === null || opts.corpusGB <= 0;
  const corpusGB = corpusEstimated
    ? (tot.effectiveTotalUsers * rates.docsPerUser * rates.docMB) / 1024
    : (opts.corpusGB as number);

  const docs = (corpusGB * 1024) / rates.docMB;
  const vectors = (corpusGB * 1e9) / rates.bytesPerToken / rates.chunkTokens;
  const idxRAM = (vectors * rates.embedDims * 4 * rates.indexOverhead) / 1e9;
  const ingestionPerDay = (docs * rates.refresh) / rates.workDays;
  const logDayGB = (tot.avgRpsTot * 86400 * tot.avgTok * rates.bytesPerToken * rates.logOverhead) / 1e9;
  const logRetGB = logDayGB * 30.4 * opts.retentionMonths;
  const weightsDiskGB = weights * opts.versions;
  const storageTB = ceilHalf(((logRetGB + corpusGB * 1.2 + idxRAM) * rates.growth * rates.raid) / 1024);

  return {
    corpusGB,
    corpusEstimated,
    docs,
    vectors,
    idxRAM,
    ingestionPerDay,
    logDayGB,
    logRetGB,
    weightsDiskGB,
    storageTB,
  };
}

export function suggestTemplate(gpuName: string, templates: Template[]): Template {
  const pick = (n: string) => templates.find((t) => t.name === n)!;
  if (/amd|mi\d/i.test(gpuName)) return pick("8-way AMD OAM");
  if (/SXM/i.test(gpuName)) return pick("8-way SXM5");
  if (/NVL/i.test(gpuName)) return pick("2-way NVLink");
  return pick("4-way PCIe");
}

export interface NodeChecks {
  mismatch: boolean;
  ramReq: number;
  ramOk: boolean;
  nvmeOk: boolean;
  fabricRequired: boolean;
}

export function computeNodeChecks(
  gpu: Gpu,
  template: Template,
  rates: Rates,
  weights: number,
  weightsDiskGB: number,
): NodeChecks {
  const isAmd = /amd|mi\d/i.test(gpu.name);
  const amdChassis = template.name === "8-way AMD OAM";
  const sxmGpu = /SXM/i.test(gpu.name);
  const sxmChassis = template.name === "8-way SXM5" || amdChassis;
  const mismatch = isAmd !== amdChassis || (sxmGpu && !sxmChassis) || (!sxmGpu && sxmChassis);
  const ramReq = template.gpn * gpu.vram * rates.ramMult + rates.osReserve;
  return {
    mismatch,
    ramReq,
    ramOk: template.ram >= ramReq,
    nvmeOk: template.nvmeTB * 1024 >= weightsDiskGB,
    fabricRequired: weights > template.gpn * gpu.vram * gpu.usable,
  };
}
