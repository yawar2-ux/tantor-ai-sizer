import tasksData from "../data/tasks.json";
import unitsData from "../data/units.json";
import modelsData from "../data/models.json";
import gpusData from "../data/gpus.json";
import precisionsData from "../data/precisions.json";
import templatesData from "../data/templates.json";
import ratesData from "../data/rates.json";

import type { Gpu, Model, Precision, Rates, Scenario, Task, Template, Unit } from "./types";
import { computeTokens, type TokenTotals } from "./tokens";
import { computeSizing, type SizingResult } from "./sizing";
import { computeInfra, computeNodeChecks, suggestTemplate, type InfraResult, type NodeChecks } from "./infra";
import { computeEnvironments, type EnvironmentsResult } from "./environments";
import { computeCost, type CostResult } from "./cost";
import { computeCloud, DEFAULT_REGIONS, type CloudResult } from "./cloud";

export const TASKS = tasksData as Task[];
export const UNITS = unitsData as Unit[];
export const MODELS = modelsData as Model[];
export const GPUS = gpusData as Gpu[];
export const PRECISIONS = precisionsData as Precision[];
export const TEMPLATES = templatesData as Template[];
export const RATES = ratesData as Rates;

export * from "./types";
export * from "./tokens";
export * from "./sizing";
export * from "./infra";
export * from "./environments";
export * from "./cost";
export * from "./cloud";
export { REGIONS, INSTANCES, PROVIDERS, PROVIDER_LABEL, DEFAULT_REGIONS } from "./cloud";

export interface ScenarioResult {
  tokens: TokenTotals;
  sizing: SizingResult;
  infra: InfraResult;
  checks: NodeChecks;
  template: Template;
  gpu: Gpu;
  model: Model;
  precision: Precision;
  environments: EnvironmentsResult;
  cost: CostResult;
  cloud: CloudResult;
}

export function defaultScenario(): Scenario {
  return {
    useCases: [
      {
        id: "uc1",
        name: "Compliance RAG assistant",
        task: "RAG Q&A",
        totalUsers: 2000,
        reqPerUserHr: 4,
      },
      {
        id: "uc2",
        name: "Document summarisation",
        task: "Summarisation",
        totalUsers: 400,
        reqPerUserHr: 2,
        inSize: 30,
        inUnit: "Pages",
        outSize: 1,
        outUnit: "Pages",
      },
      {
        id: "uc3",
        name: "Agentic workflows",
        task: "Reasoning-Agentic",
        concurrent: 30,
        reqPerUserHr: 3,
      },
    ],
    model: "Llama 3.3 70B",
    gpu: "NVIDIA H100 SXM5",
    precision: "FP8",
    ttftTargetMs: 1000,
    tpotTargetMs: 50,
    corpusUnit: "GB",
    retentionMonths: 12,
    versions: 2,
    devPct: 0.25,
    uatPct: 0.35,
    drPct: 1.0,
    drHA: false,
    virtualisation: true,
    cloudRegions: { ...DEFAULT_REGIONS },
    rates: RATES,
  };
}

export function computeScenario(s: Scenario): ScenarioResult {
  const rates = s.rates ?? RATES;
  const baseModel = MODELS.find((m) => m.name === s.model) ?? MODELS[1]!;
  const model: Model = s.customModel ? { ...baseModel, ...s.customModel } : baseModel;
  const gpu = GPUS.find((g) => g.name === s.gpu) ?? GPUS[5]!;
  const precision = PRECISIONS.find((p) => p.name === s.precision) ?? PRECISIONS[3]!;
  const template = (s.template ? TEMPLATES.find((t) => t.name === s.template) : undefined) ??
    suggestTemplate(gpu.name, TEMPLATES);

  const tokens = computeTokens(s.useCases, TASKS, UNITS, rates);
  const sizing = computeSizing(tokens, model, gpu, precision, rates, s.ttftTargetMs, s.tpotTargetMs);
  const corpusGB =
    s.corpusGB === undefined || s.corpusGB === null
      ? undefined
      : s.corpusUnit === "TB"
        ? s.corpusGB * 1024
        : s.corpusGB;
  const infra = computeInfra(tokens, rates, sizing.weights, {
    corpusGB,
    retentionMonths: s.retentionMonths,
    versions: s.versions,
  });
  const checks = computeNodeChecks(gpu, template, rates, sizing.weights, infra.weightsDiskGB);
  const environments = computeEnvironments(
    sizing.withSched,
    sizing.prodGpus,
    infra.idxRAM,
    infra.storageTB,
    template,
    gpu.vram,
    rates,
    {
      devPct: s.devPct,
      uatPct: s.uatPct,
      drPct: s.drPct,
      drHA: s.drHA,
      virtualisation: s.virtualisation,
    },
  );
  const cost = computeCost(environments, template, gpu, rates, checks.fabricRequired, tokens);
  const cloud = computeCloud(environments, gpu, rates, {
    regions: s.cloudRegions,
    instanceOverrides: s.instanceOverrides,
  });

  return { tokens, sizing, infra, checks, template, gpu, model, precision, environments, cost, cloud };
}
