import * as XLSX from "xlsx";
import type { Scenario, ScenarioResult, Provider } from "@/engine";
import { PROVIDER_LABEL, PROVIDERS } from "@/engine";

type Row = (string | number)[];

function sheet(wb: XLSX.WorkBook, name: string, rows: Row[]) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31));
}

export function boqRows(result: ScenarioResult, provider: Provider): Row[] {
  const line = result.cloud.byProvider[provider];
  const rows: Row[] = [
    ["Line item", "Instance type", "Region", "Prod", "Dev", "UAT", "DR", "Qty", "INR per hour", "USD list", "Monthly L", "Annual L"],
  ];
  for (const l of line.boq) {
    rows.push([
      l.item,
      l.type,
      l.region,
      l.qtyByEnv.Prod ?? "",
      l.qtyByEnv.Dev ?? "",
      l.qtyByEnv.UAT ?? "",
      l.qtyByEnv.DR ?? "",
      l.qty,
      Number(l.unitInrHr.toFixed(2)),
      Number(l.usdRef.toFixed(2)),
      Number(l.monthlyL.toFixed(2)),
      Number(l.annualL.toFixed(2)),
    ]);
  }
  rows.push(["Total", "", "", "", "", "", "", "", "", "", "", Number(line.boqAnnualL.toFixed(2))]);
  return rows;
}

export function exportExcel(scenario: Scenario, result: ScenarioResult) {
  const { tokens, sizing, infra, environments, cost, cloud, template, gpu, model, precision } = result;
  const wb = XLSX.utils.book_new();

  sheet(wb, "Summary", [
    ["Tantor Gen AI Sizer", "All figures INR"],
    ["Rates version", scenario.rates.version],
    ["Model", model.name],
    ["GPU", gpu.name],
    ["Precision", precision.name],
    ["Chassis", template.name],
    ["Production GPUs", sizing.prodGpus],
    ["Binding constraint", sizing.constraint],
    ["All-environment physical GPUs", environments.totalPhysicalGpus],
    ["Total nodes", environments.totalNodes],
    ["Capex list L", Number(cost.capexL.toFixed(2))],
    ["Discount L", Number(cost.discountL.toFixed(2))],
    ["GST L", Number(cost.gstL.toFixed(2))],
    ["Capex payable L", Number(cost.capexPayableL.toFixed(2))],
    ["Opex per year L", Number(cost.opexLyr.toFixed(2))],
    ["On-premise 3-year TCO L", Number(cost.tco3L.toFixed(2))],
    ["Best cloud", PROVIDER_LABEL[cloud.bestProvider]],
    ["Best cloud 3-year TCO L", Number(cloud.bestTco3L.toFixed(2))],
    ["INR per million tokens", Number(cost.perMTok.toFixed(2))],
  ]);

  sheet(wb, "Workload", [
    ["Use case", "Task", "Total users", "Concurrent", "Req per user hour", "In tokens", "Out tokens", "Peak req/s", "Prefill tok/s", "Decode tok/s"],
    ...scenario.useCases.map((u) => {
      const t = tokens.perUseCase.find((x) => x.id === u.id);
      return [
        u.name,
        u.task,
        u.totalUsers ?? "",
        t?.conc ?? "",
        u.reqPerUserHr,
        t?.inTok ?? "",
        t?.outTok ?? "",
        Number((t?.peakRps ?? 0).toFixed(3)),
        Math.round(t?.prefill ?? 0),
        Math.round(t?.decode ?? 0),
      ] as Row;
    }),
    [],
    ["Totals", "", "", "", "", "", "", Number(tokens.peakRpsTot.toFixed(2)), Math.round(tokens.prefillTot), Math.round(tokens.decodeTot)],
  ]);

  sheet(wb, "Sizing", [
    ["Metric", "Value"],
    ["Decode tokens per second per GPU", Math.round(sizing.decodeTps)],
    ["Weights GB", Number(sizing.weights.toFixed(1))],
    ["KV cache total GB", Number(sizing.kvTot.toFixed(1))],
    ["Memory GPUs", sizing.memGpus],
    ["Decode GPUs", sizing.decGpus],
    ["Prefill GPUs", sizing.preGpus],
    ["Binding constraint", sizing.constraint],
    ["Base", sizing.base],
    ["With headroom", sizing.withHead],
    ["With ancillary", sizing.withAnc],
    ["With scheduling", sizing.withSched],
    ["Production with HA", sizing.prodGpus],
    ["TTFT ms", Math.round(sizing.ttftMs)],
    ["TTFT verdict", sizing.ttftPass ? "PASS" : "REVIEW"],
    ["TPOT ms", Number(sizing.tpotMs.toFixed(1))],
    ["TPOT verdict", sizing.tpotPass ? "PASS" : "REVIEW"],
  ]);

  sheet(wb, "Infra", [
    ["Metric", "Value"],
    ["Corpus GB", Number(infra.corpusGB.toFixed(1))],
    ["Corpus estimated", infra.corpusEstimated ? "Yes, confirm with client" : "No, client provided"],
    ["Documents", Math.round(infra.docs)],
    ["Vectors", Math.round(infra.vectors)],
    ["Index RAM GB", Number(infra.idxRAM.toFixed(1))],
    ["Ingestion per working day", Math.round(infra.ingestionPerDay)],
    ["Logs per day GB", Number(infra.logDayGB.toFixed(1))],
    ["Logs retained GB", Math.round(infra.logRetGB)],
    ["Weights on disk GB", Number(infra.weightsDiskGB.toFixed(1))],
    ["Production storage TB", infra.storageTB],
  ]);

  sheet(wb, "Environments", [
    ["Metric", "Prod", "Dev", "UAT", "DR", "Total"],
    ...(
      [
        ["GPUs logical", (e: typeof environments.envs[number]) => e.logicalGpus],
        ["GPUs physical", (e: typeof environments.envs[number]) => e.physicalGpus],
        ["GPU nodes", (e: typeof environments.envs[number]) => e.gpuNodes],
        ["Vector DB nodes", (e: typeof environments.envs[number]) => e.vectorNodes],
        ["Platform nodes", (e: typeof environments.envs[number]) => e.platformNodes],
        ["Data services nodes", (e: typeof environments.envs[number]) => e.dataNodes],
        ["Services nodes", (e: typeof environments.envs[number]) => e.servicesNodes],
        ["Storage TB", (e: typeof environments.envs[number]) => e.storageTB],
      ] as const
    ).map(([label, get]) => {
      const vals = environments.envs.map((e) => get(e));
      return [label, ...vals, vals.reduce((a, b) => a + b, 0)] as Row;
    }),
  ]);

  sheet(wb, "Deployment", [
    ["Role", "vCPU", "RAM GB", "Prod", "Dev", "UAT", "DR"],
    ...environments.vms.map((v) => [v.role, v.vcpu, v.ramGB, v.counts.Prod, v.counts.Dev, v.counts.UAT, v.counts.DR] as Row),
    [],
    ["Environment", "vCPU demand", "vCPU supply", "RAM demand", "RAM supply", "Capacity"],
    ...environments.envs.map(
      (e) =>
        [
          e.name,
          Math.round(e.vcpuDemand),
          Math.round(e.vcpuSupply),
          Math.round(e.ramDemand),
          Math.round(e.ramSupply),
          e.capacityPass ? "PASS" : "REVIEW",
        ] as Row,
    ),
  ]);

  sheet(wb, "OnPrem", [
    ["Line", "INR Lakh"],
    ["Chassis", Number(cost.chassisL.toFixed(2))],
    ["GPU cards", Number(cost.cardsL.toFixed(2))],
    ["Services nodes", Number(cost.servicesL.toFixed(2))],
    ["Storage appliance", Number(cost.storageL.toFixed(2))],
    ["Ethernet", Number(cost.ethernetL.toFixed(2))],
    ["Fabric", Number(cost.fabricL.toFixed(2))],
    ["Installation", Number(cost.installL.toFixed(2))],
    ["Implementation", Number(cost.implOneL.toFixed(2))],
    ["Contingency", Number(cost.contingencyL.toFixed(2))],
    ["Capex list", Number(cost.capexL.toFixed(2))],
    ["Discount", Number(cost.discountL.toFixed(2))],
    ["GST", Number(cost.gstL.toFixed(2))],
    ["Capex payable", Number(cost.capexPayableL.toFixed(2))],
    ["Power per year", Number(cost.powerLyr.toFixed(2))],
    ["Opex per year", Number(cost.opexLyr.toFixed(2))],
    ["Three-year TCO", Number(cost.tco3L.toFixed(2))],
  ]);

  sheet(wb, "Cloud", [
    ["Provider", "Region", "Region note", "Multiplier", "USD per GPU hour list", "Effective USD", "INR per GPU hour", "Annual on-demand L", "Committed annual L", "Three-year TCO L"],
    ...cloud.lines.map(
      (l) =>
        [
          PROVIDER_LABEL[l.provider],
          l.regionName,
          l.regionNote,
          l.mult,
          l.usdPerGpuHr,
          Number(l.effUsdPerGpuHr.toFixed(2)),
          Number(l.inrPerGpuHr.toFixed(2)),
          Number(l.annualOnDemandL.toFixed(2)),
          Number(l.committedL.toFixed(2)),
          Number(l.tco3L.toFixed(2)),
        ] as Row,
    ),
  ]);

  const boq: Row[] = [];
  for (const p of PROVIDERS) {
    boq.push([PROVIDER_LABEL[p], result.cloud.byProvider[p].regionName]);
    boq.push(...boqRows(result, p));
    boq.push([]);
  }
  sheet(wb, "BOQ", boq);

  XLSX.writeFile(wb, `tantor-sizer-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportScenarioJson(scenario: Scenario) {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tantor-scenario-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
