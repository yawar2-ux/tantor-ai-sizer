import type { Rates, Template } from "./types";
import { ceilHalf } from "./infra";

export type EnvName = "Prod" | "Dev" | "UAT" | "DR";

export interface EnvResult {
  name: EnvName;
  logicalGpus: number;
  physicalGpus: number;
  gpuNodes: number;
  vectorNodes: number;
  platformNodes: number;
  dataNodes: number;
  servicesNodes: number;
  storageTB: number;
  vcpuDemand: number;
  vcpuSupply: number;
  ramDemand: number;
  ramSupply: number;
  capacityPass: boolean;
}

export interface EnvOptions {
  devPct: number;
  uatPct: number;
  drPct: number;
  drHA: boolean;
  virtualisation: boolean;
}

export interface VmRow {
  role: string;
  vcpu: number;
  ramGB: number;
  counts: Record<EnvName, number>;
}

export interface EnvironmentsResult {
  envs: EnvResult[];
  vms: VmRow[];
  totalPhysicalGpus: number;
  totalGpuNodes: number;
  totalServicesNodes: number;
  totalNodes: number;
  totalStorageTB: number;
}

export function computeEnvironments(
  withSched: number,
  prodGpus: number,
  idxRAM: number,
  prodStorageTB: number,
  template: Template,
  vramGB: number,
  rates: Rates,
  opts: EnvOptions,
): EnvironmentsResult {
  const preHAVector = Math.max(1, Math.ceil(idxRAM / (512 * 0.7)));

  const logical: Record<EnvName, number> = {
    Prod: prodGpus,
    Dev: Math.ceil(withSched * opts.devPct),
    UAT: Math.ceil(withSched * opts.uatPct),
    DR: Math.ceil(withSched * opts.drPct) + (opts.drHA ? rates.haGpus : 0),
  };

  const physical: Record<EnvName, number> = {
    Prod: logical.Prod,
    Dev: opts.virtualisation ? Math.ceil(logical.Dev / rates.migPartitions) : logical.Dev,
    UAT: opts.virtualisation ? Math.ceil(logical.UAT / rates.migPartitions) : logical.UAT,
    DR: logical.DR,
  };

  const vector: Record<EnvName, number> = {
    Prod: Math.max(2, preHAVector),
    Dev: 1,
    UAT: 1,
    DR: opts.drHA
      ? Math.max(2, Math.ceil(preHAVector * opts.drPct))
      : Math.max(1, Math.ceil(preHAVector * opts.drPct)),
  };
  const platform: Record<EnvName, number> = { Prod: 3, Dev: 1, UAT: 1, DR: opts.drHA ? 3 : 1 };
  const data: Record<EnvName, number> = { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 };

  const storage: Record<EnvName, number> = {
    Prod: prodStorageTB,
    Dev: ceilHalf(prodStorageTB * opts.devPct),
    UAT: ceilHalf(prodStorageTB * opts.uatPct),
    DR: ceilHalf(prodStorageTB * opts.drPct),
  };

  const names: EnvName[] = ["Prod", "Dev", "UAT", "DR"];

  const vms: VmRow[] = [
    {
      role: "LLM inference",
      vcpu: 16,
      ramGB: 2 * vramGB,
      counts: { Prod: physical.Prod, Dev: physical.Dev, UAT: physical.UAT, DR: physical.DR },
    },
    { role: "Embedding service", vcpu: 8, ramGB: 32, counts: { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 } },
    {
      role: "Vector database",
      vcpu: 32,
      ramGB: 256,
      counts: { Prod: vector.Prod, Dev: vector.Dev, UAT: vector.UAT, DR: vector.DR },
    },
    { role: "Kubernetes control plane", vcpu: 8, ramGB: 32, counts: { Prod: 3, Dev: 1, UAT: 1, DR: opts.drHA ? 3 : 1 } },
    { role: "Observability", vcpu: 8, ramGB: 64, counts: { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 } },
    { role: "Relational database", vcpu: 16, ramGB: 128, counts: { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 } },
    { role: "Message queue", vcpu: 8, ramGB: 32, counts: { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 } },
    { role: "API gateway", vcpu: 8, ramGB: 16, counts: { Prod: 2, Dev: 1, UAT: 1, DR: opts.drHA ? 2 : 1 } },
    { role: "Tantor platform", vcpu: 16, ramGB: 64, counts: { Prod: 3, Dev: 1, UAT: 1, DR: opts.drHA ? 3 : 1 } },
  ];

  const envs: EnvResult[] = names.map((name) => {
    const servicesNodes = vector[name] + platform[name] + data[name];
    const svcVms = vms.filter((v) => v.role !== "LLM inference");
    const vcpuDemand = svcVms.reduce((a, v) => a + v.vcpu * v.counts[name], 0);
    const ramDemand = svcVms.reduce((a, v) => a + v.ramGB * v.counts[name], 0);
    const vcpuSupply = servicesNodes * 64 * rates.oversub * (1 - rates.k8sOverhead);
    const ramSupply = servicesNodes * 512 * 0.9 * (1 - rates.k8sOverhead);
    return {
      name,
      logicalGpus: logical[name],
      physicalGpus: physical[name],
      gpuNodes: Math.ceil(physical[name] / template.gpn),
      vectorNodes: vector[name],
      platformNodes: platform[name],
      dataNodes: data[name],
      servicesNodes,
      storageTB: storage[name],
      vcpuDemand,
      vcpuSupply,
      ramDemand,
      ramSupply,
      capacityPass: vcpuDemand <= vcpuSupply && ramDemand <= ramSupply,
    };
  });

  const sum = (f: (e: EnvResult) => number) => envs.reduce((a, e) => a + f(e), 0);
  const totalGpuNodes = sum((e) => e.gpuNodes);
  const totalServicesNodes = sum((e) => e.servicesNodes);

  return {
    envs,
    vms,
    totalPhysicalGpus: sum((e) => e.physicalGpus),
    totalGpuNodes,
    totalServicesNodes,
    totalNodes: totalGpuNodes + totalServicesNodes,
    totalStorageTB: sum((e) => e.storageTB),
  };
}
