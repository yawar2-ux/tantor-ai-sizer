export interface Task {
  name: string;
  inTok: number;
  outTok: number;
  mult: number;
}

export interface Unit {
  name: string;
  tokens: number;
}

export interface Model {
  name: string;
  totalB: number;
  activeB: number;
  kv1k: number;
  editable?: boolean;
}

export interface Gpu {
  name: string;
  vram: number;
  usable: number;
  idx: number;
  cardL: number;
  watts: number;
  cloudRate: { aws: number; azure: number; gcp: number; oci: number };
  avail: string;
}

export interface Precision {
  name: string;
  bytes: number;
  tput: number;
}

export interface Template {
  name: string;
  gpn: number;
  cores: number;
  ram: number;
  nvmeTB: number;
  nic: string;
  priceL: number;
  watts: number;
}

export interface Rates {
  version: string;
  peakFactor: number;
  servingEff: number;
  headroom: number;
  schedOverhead: number;
  haGpus: number;
  fx: number;
  tariff: number;
  utilisation: number;
  hoursMonth: number;
  cloudUplift: number;
  amcPct: number;
  manpowerL: number;
  facilitiesL: number;
  committedFactor: number;
  inflightLatency: number;
  prefillMult: number;
  weightOverhead: number;
  calibK: number;
  streamsPerGpu: number;
  concRatio: number;
  installPct: number;
  contPct: number;
  implOneL: number;
  nvaieLperGpu: number;
  k8sLicLperNode: number;
  k8sOverhead: number;
  refresh: number;
  workDays: number;
  docsPerUser: number;
  docMB: number;
  embedDims: number;
  chunkTokens: number;
  bytesPerToken: number;
  logOverhead: number;
  indexOverhead: number;
  growth: number;
  raid: number;
  ramMult: number;
  osReserve: number;
  cloudCpuHr: number;
  ethPerNodeL: number;
  fabricBaseL: number;
  fabricPerNodeL: number;
  applianceLperTB: number;
  migPartitions: number;
  oversub: number;
}

export interface UseCase {
  id: string;
  name: string;
  task: string;
  totalUsers?: number | undefined;
  concurrent?: number | undefined;
  reqPerUserHr: number;
  inSize?: number | undefined;
  inUnit?: string | undefined;
  outSize?: number | undefined;
  outUnit?: string | undefined;
}

export interface Scenario {
  useCases: UseCase[];
  model: string;
  customModel?: { totalB: number; activeB: number; kv1k: number } | undefined;
  gpu: string;
  precision: string;
  ttftTargetMs: number;
  tpotTargetMs: number;
  corpusGB?: number | undefined;
  corpusUnit: "GB" | "TB";
  retentionMonths: number;
  versions: number;
  template?: string | undefined;
  devPct: number;
  uatPct: number;
  drPct: number;
  drHA: boolean;
  virtualisation: boolean;
  cloudRegions?: Partial<Record<"aws" | "azure" | "gcp" | "oci", string>> | undefined;
  instanceOverrides?: Partial<Record<"aws" | "azure" | "gcp" | "oci", string>> | undefined;
  rates: Rates;
  commercial?: Commercial | undefined;
}

/** Negotiation and recurring Tantor commercial terms, all optional. */
export interface Commercial {
  discountPct: number;
  gstPct: number;
  licenceLyr: number;
  supportLyr: number;
}

export const DEFAULT_COMMERCIAL: Commercial = {
  discountPct: 0,
  gstPct: 0,
  licenceLyr: 0,
  supportLyr: 0,
};

