import { describe, expect, it } from "vitest";
import { computeScenario, defaultScenario } from "./index";

describe("golden scenario", () => {
  const r = computeScenario(defaultScenario());

  it("token engine", () => {
    expect(r.tokens.peakRpsTot).toBeCloseTo(0.35, 2);
    expect(Math.round(r.tokens.prefillTot)).toBe(2512);
    expect(Math.round(r.tokens.decodeTot)).toBe(388);
  });

  it("sizing chain", () => {
    expect(r.sizing.constraint).toBe("Memory");
    expect(r.sizing.replicaGpus).toBe(2);
    expect(r.sizing.throughputGpus).toBe(2);
    expect(r.sizing.base).toBe(2);
    expect(r.sizing.schedApplied).toBe(false);
    expect(r.sizing.withSched).toBe(2);
    expect(r.sizing.prodGpus).toBe(4);
  });

  it("latency", () => {
    expect(r.sizing.ttftMs).toBeGreaterThan(1279);
    expect(r.sizing.ttftMs).toBeLessThan(1282);
    expect(r.sizing.ttftPass).toBe(false);
    expect(r.sizing.tpotMs).toBeCloseTo(22.9, 1);
    expect(r.sizing.tpotPass).toBe(true);
  });

  it("infrastructure", () => {
    expect(r.infra.corpusEstimated).toBe(true);
    expect(r.infra.corpusGB).toBeCloseTo(65.9, 1);
    expect(r.infra.idxRAM).toBeCloseTo(237.3, 1);
    expect(r.infra.storageTB).toBe(3.0);
  });

  it("environments", () => {
    const prod = r.environments.envs.find((e) => e.name === "Prod")!;
    expect(prod.servicesNodes).toBe(7);
    expect(prod.vectorNodes).toBe(2);
    expect(prod.platformNodes).toBe(3);
    expect(prod.dataNodes).toBe(2);
    expect(prod.vcpuSupply).toBeCloseTo(824.3, 1);
  });

  it("cost", () => {
    expect(Math.round(r.cost.capexL)).toBe(805);
    expect(Math.round(r.cost.tco3L)).toBe(1135);
  });
});
