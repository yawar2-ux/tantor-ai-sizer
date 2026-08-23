import type { Gpu, Rates } from "./types";
import type { EnvironmentsResult } from "./environments";

export type Provider = "aws" | "azure" | "gcp" | "oci";
export const PROVIDERS: Provider[] = ["aws", "azure", "gcp", "oci"];
export const PROVIDER_LABEL: Record<Provider, string> = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  oci: "OCI",
};

export interface CloudLine {
  provider: Provider;
  usdPerGpuHr: number;
  inrPerGpuHr: number;
  gpuL: number;
  cpuL: number;
  upliftL: number;
  tco3L: number;
}

export interface CloudResult {
  lines: CloudLine[];
  bestProvider: Provider;
  bestTco3L: number;
}

/** Three-year cloud run cost in INR Lakh. All USD list rates converted at rates.fx. */
export function computeCloud(env: EnvironmentsResult, gpu: Gpu, rates: Rates): CloudResult {
  const hours3yr = rates.hoursMonth * 12 * 3;
  const gpuHours = env.totalPhysicalGpus * hours3yr;
  const cpuHours = env.totalServicesNodes * hours3yr;

  const lines: CloudLine[] = PROVIDERS.map((provider) => {
    const usdPerGpuHr = gpu.cloudRate[provider];
    const inrPerGpuHr = usdPerGpuHr * rates.fx;
    const discount = 1 - rates.committedFactor * 0.4;
    const gpuL = (gpuHours * inrPerGpuHr * discount) / 1e5;
    const cpuL = (cpuHours * rates.cloudCpuHr * rates.fx) / 1e5;
    const upliftL = (gpuL + cpuL) * rates.cloudUplift;
    return { provider, usdPerGpuHr, inrPerGpuHr, gpuL, cpuL, upliftL, tco3L: gpuL + cpuL + upliftL };
  });

  const best = lines.reduce((a, b) => (b.tco3L < a.tco3L ? b : a));
  return { lines, bestProvider: best.provider, bestTco3L: best.tco3L };
}
