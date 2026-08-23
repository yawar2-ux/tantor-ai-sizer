import type { Rates, Task, Unit, UseCase } from "./types";

export interface UseCaseTokens {
  id: string;
  name: string;
  inTok: number;
  outTok: number;
  conc: number;
  totalUsers: number;
  avgRps: number;
  peakRps: number;
  prefill: number;
  decode: number;
  inflight: number;
}

export interface TokenTotals {
  perUseCase: UseCaseTokens[];
  avgRpsTot: number;
  peakRpsTot: number;
  prefillTot: number;
  decodeTot: number;
  inflightTot: number;
  effectiveTotalUsers: number;
  avgTok: number;
}

export function tokensFor(size: number | undefined, unit: string | undefined, units: Unit[]): number | undefined {
  if (size === undefined || size === null || !unit) return undefined;
  const u = units.find((x) => x.name === unit);
  if (!u) return undefined;
  return size * u.tokens;
}

export function computeUseCase(uc: UseCase, tasks: Task[], units: Unit[], rates: Rates): UseCaseTokens {
  const task: Task = tasks.find((t) => t.name === uc.task) ?? tasks[0]!;
  const inTok = tokensFor(uc.inSize, uc.inUnit, units) ?? task.inTok;
  const outTok = tokensFor(uc.outSize, uc.outUnit, units) ?? task.outTok;
  const conc =
    uc.concurrent !== undefined && uc.concurrent !== null && uc.concurrent > 0
      ? uc.concurrent
      : (uc.totalUsers ?? 0) * rates.concRatio;
  const totalUsers =
    uc.totalUsers !== undefined && uc.totalUsers !== null && uc.totalUsers > 0
      ? uc.totalUsers
      : conc / rates.concRatio;
  const avgRps = (conc * uc.reqPerUserHr) / 3600;
  const peakRps = avgRps * rates.peakFactor;
  return {
    id: uc.id,
    name: uc.name,
    inTok,
    outTok,
    conc,
    totalUsers,
    avgRps,
    peakRps,
    prefill: peakRps * inTok * task.mult,
    decode: peakRps * outTok * task.mult,
    inflight: peakRps * rates.inflightLatency,
  };
}

export function computeTokens(useCases: UseCase[], tasks: Task[], units: Unit[], rates: Rates): TokenTotals {
  const perUseCase = useCases.map((uc) => computeUseCase(uc, tasks, units, rates));
  const sum = (f: (u: UseCaseTokens) => number) => perUseCase.reduce((a, u) => a + f(u), 0);
  const peakRpsTot = sum((u) => u.peakRps);
  const prefillTot = sum((u) => u.prefill);
  const decodeTot = sum((u) => u.decode);
  return {
    perUseCase,
    avgRpsTot: sum((u) => u.avgRps),
    peakRpsTot,
    prefillTot,
    decodeTot,
    inflightTot: sum((u) => u.inflight),
    effectiveTotalUsers: sum((u) => u.totalUsers),
    avgTok: peakRpsTot > 0 ? (prefillTot + decodeTot) / peakRpsTot : 0,
  };
}
