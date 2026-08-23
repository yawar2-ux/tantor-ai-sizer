import type { Gpu, Rates } from "./types";
import type { EnvironmentsResult, EnvName } from "./environments";
import regionsData from "../data/regions.json";
import instancesData from "../data/instances.json";

export type Provider = "aws" | "azure" | "gcp" | "oci";
export const PROVIDERS: Provider[] = ["aws", "azure", "gcp", "oci"];
export const PROVIDER_LABEL: Record<Provider, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  oci: "OCI",
};

export interface Region {
  id: string;
  name: string;
  mult: number;
  note?: string;
  india?: boolean;
}

export interface InstanceMap {
  services: { type: string; vcpu: number };
  gpus: { gpu: string; type: string; gpn: number }[];
}

export const REGIONS = regionsData as Record<Provider, Region[]>;
export const INSTANCES = instancesData as Record<Provider, InstanceMap>;

export const DEFAULT_REGIONS: Record<Provider, string> = PROVIDERS.reduce(
  (acc, p) => {
    const list = REGIONS[p];
    acc[p] = (list.find((r) => r.india) ?? list[0]!).id;
    return acc;
  },
  {} as Record<Provider, string>,
);

/** Object storage and egress list assumptions, USD. */
export const OBJECT_STORAGE_USD_PER_GB_MONTH = 0.023;
export const EGRESS_USD_PER_GB = 0.09;
export const EGRESS_ALLOWANCE_GB_PER_TB_MONTH = 50;

export interface BoqLine {
  item: string;
  type: string;
  region: string;
  qtyByEnv: Partial<Record<EnvName, number>>;
  qty: number;
  unitInrHr: number;
  usdRef: number;
  monthlyL: number;
  annualL: number;
  nearestEquivalent?: boolean;
}

export interface CloudLine {
  provider: Provider;
  regionId: string;
  regionName: string;
  regionNote: string;
  mult: number;
  usdPerGpuHr: number;
  effUsdPerGpuHr: number;
  inrPerGpuHr: number;
  annualOnDemandL: number;
  committedL: number;
  tco3L: number;
  instanceType: string;
  gpn: number;
  nearestEquivalent: boolean;
  boq: BoqLine[];
  boqAnnualL: number;
}

export interface CloudResult {
  lines: CloudLine[];
  byProvider: Record<Provider, CloudLine>;
  bestProvider: Provider;
  bestTco3L: number;
}

export interface CloudOptions {
  regions?: Partial<Record<Provider, string>> | undefined;
  /** Manual instance type when the GPU has no native mapping, keyed by provider. */
  instanceOverrides?: Partial<Record<Provider, string>> | undefined;
}

const ENV_NAMES: EnvName[] = ["Prod", "Dev", "UAT", "DR"];

/** Cloud run cost in INR Lakh, per provider, at that provider's selected region. */
export function computeCloud(
  env: EnvironmentsResult,
  gpu: Gpu,
  rates: Rates,
  opts: CloudOptions = {},
): CloudResult {
  const lines: CloudLine[] = PROVIDERS.map((provider) => {
    const list = REGIONS[provider];
    const region =
      list.find((r) => r.id === (opts.regions?.[provider] ?? DEFAULT_REGIONS[provider])) ?? list[0]!;

    const usdPerGpuHr = gpu.cloudRate[provider];
    const effUsdPerGpuHr = usdPerGpuHr * region.mult;
    const inrPerGpuHr = effUsdPerGpuHr * rates.fx;

    const hoursYear = rates.hoursMonth * 12;
    const annualOnDemandL =
      ((env.totalPhysicalGpus * effUsdPerGpuHr + env.totalServicesNodes * rates.cloudCpuHr) *
        hoursYear *
        (1 + rates.cloudUplift) *
        rates.fx) /
      1e5;
    const committedL = annualOnDemandL * rates.committedFactor;
    const tco3L = 3 * committedL;

    const map = INSTANCES[provider];
    const native = map.gpus.find((g) => g.gpu === gpu.name);
    const gpn = native?.gpn ?? 8;
    const instanceType = native?.type ?? opts.instanceOverrides?.[provider] ?? "no native instance; nearest equivalent";

    const money = (qty: number, unitInrHr: number) => {
      const monthlyL = (qty * unitInrHr * rates.hoursMonth) / 1e5;
      return { monthlyL, annualL: monthlyL * 12 };
    };

    const gpuQtyByEnv: Partial<Record<EnvName, number>> = {};
    for (const name of ENV_NAMES) {
      const e = env.envs.find((x) => x.name === name);
      gpuQtyByEnv[name] = e ? Math.ceil(e.physicalGpus / gpn) : 0;
    }
    const gpuQty = ENV_NAMES.reduce((a, n) => a + (gpuQtyByEnv[n] ?? 0), 0);
    const gpuUnitInrHr = inrPerGpuHr * gpn;

    const svcQtyByEnv: Partial<Record<EnvName, number>> = {};
    for (const name of ENV_NAMES) {
      svcQtyByEnv[name] = env.envs.find((x) => x.name === name)?.servicesNodes ?? 0;
    }
    const svcUnitInrHr = rates.cloudCpuHr * rates.fx;

    const storageGB = env.totalStorageTB * 1024;
    const storageInrHr = (storageGB * OBJECT_STORAGE_USD_PER_GB_MONTH * rates.fx) / rates.hoursMonth;
    const egressGBmonth = env.totalStorageTB * EGRESS_ALLOWANCE_GB_PER_TB_MONTH;
    const egressInrHr = (egressGBmonth * EGRESS_USD_PER_GB * rates.fx) / rates.hoursMonth;

    const base: BoqLine[] = [
      {
        item: "GPU compute instances",
        type: instanceType,
        region: region.id,
        qtyByEnv: gpuQtyByEnv,
        qty: gpuQty,
        unitInrHr: gpuUnitInrHr,
        usdRef: usdPerGpuHr * gpn,
        ...money(gpuQty, gpuUnitInrHr),
        nearestEquivalent: !native,
      },
      {
        item: "Services instances",
        type: map.services.type,
        region: region.id,
        qtyByEnv: svcQtyByEnv,
        qty: env.totalServicesNodes,
        unitInrHr: svcUnitInrHr,
        usdRef: rates.cloudCpuHr,
        ...money(env.totalServicesNodes, svcUnitInrHr),
      },
      {
        item: `Object storage (${Math.round(storageGB)} GB)`,
        type: "Standard object storage",
        region: region.id,
        qtyByEnv: {},
        qty: 1,
        unitInrHr: storageInrHr,
        usdRef: storageGB * OBJECT_STORAGE_USD_PER_GB_MONTH,
        ...money(1, storageInrHr),
      },
      {
        item: `Egress allowance (${Math.round(egressGBmonth)} GB per month)`,
        type: "Data transfer out",
        region: region.id,
        qtyByEnv: {},
        qty: 1,
        unitInrHr: egressInrHr,
        usdRef: egressGBmonth * EGRESS_USD_PER_GB,
        ...money(1, egressInrHr),
      },
    ];

    const subtotalHr = base.reduce((a, l) => a + l.qty * l.unitInrHr, 0);
    const supportInrHr = subtotalHr * rates.cloudUplift;
    const support: BoqLine = {
      item: `Support plan (${Math.round(rates.cloudUplift * 100)} per cent)`,
      type: "Enterprise support",
      region: region.id,
      qtyByEnv: {},
      qty: 1,
      unitInrHr: supportInrHr,
      usdRef: supportInrHr / rates.fx,
      ...money(1, supportInrHr),
    };

    const boq = [...base, support];

    return {
      provider,
      regionId: region.id,
      regionName: region.name,
      regionNote: region.note ?? "",
      mult: region.mult,
      usdPerGpuHr,
      effUsdPerGpuHr,
      inrPerGpuHr,
      annualOnDemandL,
      committedL,
      tco3L,
      instanceType,
      gpn,
      nearestEquivalent: !native,
      boq,
      boqAnnualL: boq.reduce((a, l) => a + l.annualL, 0),
    };
  });

  const best = lines.reduce((a, b) => (b.tco3L < a.tco3L ? b : a));
  const byProvider = Object.fromEntries(lines.map((l) => [l.provider, l])) as Record<Provider, CloudLine>;
  return { lines, byProvider, bestProvider: best.provider, bestTco3L: best.tco3L };
}
