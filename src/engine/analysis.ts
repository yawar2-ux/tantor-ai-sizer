import { computeScenario } from "./index";
import type { Scenario, ScenarioResult } from "./index";
import type { EnvName } from "./environments";

/** ---------- Sensitivity: concurrent users scaled 0.5x to 3.0x ---------- */

export interface SensitivityPoint {
  mult: number;
  onPremTco3L: number;
  bestCloudTco3L: number;
  bestCloudProvider: string;
  prodGpus: number;
}

export function scaleUsers(s: Scenario, mult: number): Scenario {
  return {
    ...s,
    useCases: s.useCases.map((uc) => ({
      ...uc,
      totalUsers: uc.totalUsers === undefined ? undefined : Math.max(1, Math.round(uc.totalUsers * mult)),
      concurrent: uc.concurrent === undefined ? undefined : Math.max(1, Math.round(uc.concurrent * mult)),
    })),
  };
}

export function sensitivity(s: Scenario, steps = [0.5, 1, 1.5, 2, 2.5, 3]): SensitivityPoint[] {
  return steps.map((mult) => {
    const r = computeScenario(scaleUsers(s, mult));
    return {
      mult,
      onPremTco3L: r.cost.tco3L,
      bestCloudTco3L: r.cloud.bestTco3L,
      bestCloudProvider: r.cloud.bestProvider,
      prodGpus: r.sizing.prodGpus,
    };
  });
}

/** ---------- Break-even: utilisation 10% to 90% ---------- */

export interface BreakEvenPoint {
  utilisation: number;
  onPremTco3L: number;
  cloudTco3L: number;
}

export interface BreakEvenResult {
  points: BreakEvenPoint[];
  /** Utilisation (fraction) at which on-premise becomes the cheaper option, null when it never does. */
  crossover: number | null;
  provider: string;
}

export function breakEven(s: Scenario, utils = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]): BreakEvenResult {
  const base = computeScenario(s);
  const provider = base.cloud.bestProvider;
  const baseCloud = base.cloud.bestTco3L;

  const points = utils.map((u) => {
    const r = computeScenario({ ...s, rates: { ...s.rates, utilisation: u } });
    // On-premise capex is committed regardless of utilisation; only energy tracks it.
    // Cloud is consumption priced, so hours billed track utilisation directly.
    return {
      utilisation: u,
      onPremTco3L: r.cost.tco3L,
      cloudTco3L: (baseCloud * u) / s.rates.utilisation,
    };
  });

  let crossover: number | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const da = a.cloudTco3L - a.onPremTco3L;
    const db = b.cloudTco3L - b.onPremTco3L;
    if (da < 0 && db >= 0) {
      const t = da / (da - db);
      crossover = a.utilisation + t * (b.utilisation - a.utilisation);
      break;
    }
  }

  return { points, crossover, provider };
}

/** ---------- Rack and power ---------- */

export interface RackEnvRow {
  name: EnvName;
  gpuNodes: number;
  servicesNodes: number;
  nodeKw: number;
  totalKw: number;
  racks: number;
}

export interface RackPowerResult {
  rows: RackEnvRow[];
  totalKw: number;
  totalRacks: number;
  kwPerRack: number;
  nodeKw: number;
  highDensity: boolean;
}

export const DEFAULT_KW_PER_RACK = 7;

export function rackPower(result: ScenarioResult, kwPerRack = DEFAULT_KW_PER_RACK): RackPowerResult {
  const { environments, template, gpu } = result;
  const gpusPerNode = template.gpn;
  const nodeKw = (template.watts + gpusPerNode * gpu.watts) / 1000;
  const svcKw = 0.45;

  const rows: RackEnvRow[] = environments.envs.map((e) => {
    const totalKw = e.gpuNodes * nodeKw + e.servicesNodes * svcKw;
    return {
      name: e.name,
      gpuNodes: e.gpuNodes,
      servicesNodes: e.servicesNodes,
      nodeKw,
      totalKw,
      racks: Math.max(totalKw > 0 ? 1 : 0, Math.ceil(totalKw / kwPerRack)),
    };
  });

  const totalKw = rows.reduce((a, r) => a + r.totalKw, 0);
  return {
    rows,
    totalKw,
    totalRacks: rows.reduce((a, r) => a + r.racks, 0),
    kwPerRack,
    nodeKw,
    highDensity: nodeKw > kwPerRack,
  };
}

/** ---------- Phased deployment ---------- */

export interface PhaseRow {
  year: number;
  pct: number;
  cumulativeGpus: number;
  incrementalGpus: number;
  cumulativeCapexL: number;
  stagedCapexL: number;
}

export const DEFAULT_PHASES: [number, number, number] = [0.5, 0.8, 1];

export function phasedPlan(result: ScenarioResult, phases: number[] = DEFAULT_PHASES): PhaseRow[] {
  const prodGpus = result.sizing.prodGpus;
  const capexL = result.cost.capexL;
  let prevGpus = 0;
  let prevCapex = 0;

  return phases.map((pct, i) => {
    const cumulativeGpus = Math.ceil(prodGpus * pct);
    const cumulativeCapexL = capexL * pct;
    const row: PhaseRow = {
      year: i + 1,
      pct,
      cumulativeGpus,
      incrementalGpus: Math.max(0, cumulativeGpus - prevGpus),
      cumulativeCapexL,
      stagedCapexL: Math.max(0, cumulativeCapexL - prevCapex),
    };
    prevGpus = cumulativeGpus;
    prevCapex = cumulativeCapexL;
    return row;
  });
}
