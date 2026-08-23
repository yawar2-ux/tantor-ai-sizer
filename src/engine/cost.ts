import { DEFAULT_COMMERCIAL, type Commercial, type Gpu, type Rates, type Template } from "./types";
import type { EnvironmentsResult } from "./environments";

export interface CostResult {
  chassisL: number;
  cardsL: number;
  servicesL: number;
  storageL: number;
  hwL: number;
  ethernetL: number;
  fabricL: number;
  installL: number;
  contingencyL: number;
  implOneL: number;
  /** List capex, before any negotiated discount or GST. */
  capexL: number;
  /** Rupee value of the negotiated discount, in Lakh. */
  discountL: number;
  /** Capex after discount, before GST. */
  capexNetL: number;
  /** GST charged on the discounted capex. */
  gstL: number;
  /** Cash capex the client pays: net capex plus GST. */
  capexPayableL: number;
  licenceLyr: number;
  supportLyr: number;
  powerLyr: number;
  opexLyr: number;
  tco3L: number;
  tokensYrM: number;
  perMTok: number;
}

export function computeCost(
  env: EnvironmentsResult,
  template: Template,
  gpu: Gpu,
  rates: Rates,
  fabricRequired: boolean,
  totals: { prefillTot: number; decodeTot: number },
  commercial: Commercial = DEFAULT_COMMERCIAL,
): CostResult {
  const prodNodes = env.envs.find((e) => e.name === "Prod")?.gpuNodes ?? 0;
  const drNodes = env.envs.find((e) => e.name === "DR")?.gpuNodes ?? 0;


  const chassisL = env.totalGpuNodes * template.priceL;
  const cardsL = env.totalPhysicalGpus * gpu.cardL;
  const servicesL = env.totalServicesNodes * 14;
  const storageL = env.totalStorageTB * rates.applianceLperTB;
  const hwL = chassisL + cardsL + servicesL + storageL;
  const ethernetL = env.totalNodes * rates.ethPerNodeL;
  const fabricL = fabricRequired
    ? rates.fabricBaseL * (1 + (drNodes > 0 ? 1 : 0)) + rates.fabricPerNodeL * (prodNodes + drNodes)
    : 0;
  const installL = hwL * rates.installPct;
  const contingencyL = (hwL + ethernetL + fabricL + installL + rates.implOneL) * rates.contPct;
  const capexL = hwL + ethernetL + fabricL + installL + rates.implOneL + contingencyL;

  const powerLyr =
    ((env.totalGpuNodes * template.watts + env.totalPhysicalGpus * gpu.watts + env.totalServicesNodes * 450) *
      8760 *
      rates.utilisation *
      rates.tariff) /
    1e8;

  const opexLyr =
    powerLyr +
    hwL * rates.amcPct +
    rates.manpowerL +
    rates.facilitiesL +
    (rates.nvaieLperGpu * env.totalPhysicalGpus + rates.k8sLicLperNode * env.totalNodes);

  const tco3L = capexL + 3 * opexLyr;
  const tokensYrM =
    (((totals.prefillTot + totals.decodeTot) / rates.peakFactor) * rates.utilisation * 3600 * 8760) / 1e6;
  const perMTok = tokensYrM > 0 ? ((tco3L / 3) * 1e5) / tokensYrM : 0;

  return {
    chassisL,
    cardsL,
    servicesL,
    storageL,
    hwL,
    ethernetL,
    fabricL,
    installL,
    contingencyL,
    implOneL: rates.implOneL,
    capexL,
    powerLyr,
    opexLyr,
    tco3L,
    tokensYrM,
    perMTok,
  };
}
