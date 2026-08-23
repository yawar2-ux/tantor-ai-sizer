import { useMemo, useState } from "react";
import { LineChartSvg } from "@/components/charts/LineChartSvg";
import { inrLakh, num } from "@/lib/format";
import {
  breakEven,
  DEFAULT_KW_PER_RACK,
  DEFAULT_PHASES,
  phasedPlan,
  rackPower,
  sensitivity,
} from "@/engine/analysis";
import { PROVIDER_LABEL, type Provider, type Scenario, type ScenarioResult } from "@/engine";

const PURPLE = "#3D145F";
const ROSE = "#DF678C";
const OLIVE = "#707019";
const td = "px-3 py-2 text-sm";
const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";

export function SensitivityPanel({ scenario }: { scenario: Scenario }) {
  const points = useMemo(() => sensitivity(scenario), [scenario]);
  const provider = points[0]?.bestCloudProvider as Provider | undefined;

  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Sensitivity: concurrent users 0.5x to 3x</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Three-year TCO for on-premise and the cheapest cloud, with production GPUs on the right axis.
      </p>
      <LineChartSvg
        xLabel="Concurrency multiplier"
        yLabel="3-year TCO, INR Lakh"
        yRightLabel="production GPUs"
        formatX={(x) => `${x}x`}
        formatY={(y) => `${Math.round(y)} L`}
        marker={undefined}
        series={[
          { label: "On-premise 3-yr TCO", colour: PURPLE, points: points.map((p) => ({ x: p.mult, y: p.onPremTco3L })) },
          {
            label: `Best cloud${provider ? ` (${PROVIDER_LABEL[provider]})` : ""} 3-yr TCO`,
            colour: ROSE,
            points: points.map((p) => ({ x: p.mult, y: p.bestCloudTco3L })),
          },
          {
            label: "Production GPUs",
            colour: OLIVE,
            dashed: true,
            right: true,
            points: points.map((p) => ({ x: p.mult, y: p.prodGpus })),
          },
        ]}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Scale</th>
              <th className={`${th} text-right`}>Production GPUs</th>
              <th className={`${th} text-right`}>On-prem 3-yr</th>
              <th className={`${th} text-right`}>Best cloud 3-yr</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.mult} className="border-b border-border last:border-0">
                <td className={`${td} numeral`}>{p.mult}x</td>
                <td className={`${td} numeral text-right`}>{num(p.prodGpus)}</td>
                <td className={`${td} numeral text-right`}>{inrLakh(p.onPremTco3L)}</td>
                <td className={`${td} numeral text-right`}>{inrLakh(p.bestCloudTco3L)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BreakEvenPanel({ scenario }: { scenario: Scenario }) {
  const be = useMemo(() => breakEven(scenario), [scenario]);
  const provider = be.provider as Provider;

  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Break-even against utilisation</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        On-premise capex is committed whatever the load; cloud is billed by the hour, so the two cross once the estate is
        busy enough.
      </p>
      <LineChartSvg
        xLabel="Utilisation"
        yLabel="3-year TCO, INR Lakh"
        formatX={(x) => `${Math.round(x * 100)}%`}
        formatY={(y) => `${Math.round(y)} L`}
        marker={
          be.crossover
            ? { x: be.crossover, label: `crossover ${Math.round(be.crossover * 100)}%` }
            : undefined
        }
        series={[
          {
            label: "On-premise 3-yr TCO",
            colour: PURPLE,
            points: be.points.map((p) => ({ x: p.utilisation, y: p.onPremTco3L })),
          },
          {
            label: `${PROVIDER_LABEL[provider]} 3-yr TCO`,
            colour: ROSE,
            points: be.points.map((p) => ({ x: p.utilisation, y: p.cloudTco3L })),
          },
        ]}
      />
      <p className="mt-3 text-sm">
        {be.crossover ? (
          <>
            On-premise becomes the cheaper option above{" "}
            <span className="font-semibold text-rose">{Math.round(be.crossover * 100)}% utilisation</span>.
          </>
        ) : (
          <span className="text-muted-foreground">
            No crossover in the 10 to 90 percent band at these rates; one estate stays cheaper throughout.
          </span>
        )}
      </p>
    </section>
  );
}

export function RackPowerPanel({ result }: { result: ScenarioResult }) {
  const [kwPerRack, setKw] = useState(DEFAULT_KW_PER_RACK);
  const rp = useMemo(() => rackPower(result, kwPerRack || DEFAULT_KW_PER_RACK), [result, kwPerRack]);

  return (
    <section className="card-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Rack and power</h2>
          <p className="text-xs text-muted-foreground">
            Node draw is chassis plus cards; racks are filled to the configured limit.
          </p>
        </div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          kW per rack
          <input
            type="number"
            min={1}
            step={0.5}
            className={`${field} mt-1 w-32`}
            value={kwPerRack}
            onChange={(e) => setKw(Number(e.target.value))}
          />
        </label>
      </div>

      {rp.highDensity && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          A single GPU node draws {num(rp.nodeKw, 2)} kW, above the {num(rp.kwPerRack, 1)} kW rack limit: high-density row
          or liquid cooling required.
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Environment</th>
            <th className={`${th} text-right`}>GPU nodes</th>
            <th className={`${th} text-right`}>Services nodes</th>
            <th className={`${th} text-right`}>kW per GPU node</th>
            <th className={`${th} text-right`}>Total kW</th>
            <th className={`${th} text-right`}>Racks</th>
          </tr>
        </thead>
        <tbody>
          {rp.rows.map((r) => (
            <tr key={r.name} className="border-b border-border">
              <td className={td}>{r.name}</td>
              <td className={`${td} numeral text-right`}>{num(r.gpuNodes)}</td>
              <td className={`${td} numeral text-right`}>{num(r.servicesNodes)}</td>
              <td className={`${td} numeral text-right`}>{num(r.nodeKw, 2)}</td>
              <td className={`${td} numeral text-right`}>{num(r.totalKw, 2)}</td>
              <td className={`${td} numeral text-right`}>{num(r.racks)}</td>
            </tr>
          ))}
          <tr>
            <td className={`${td} font-semibold`}>Total</td>
            <td className={td} />
            <td className={td} />
            <td className={td} />
            <td className={`${td} numeral text-right font-semibold text-rose`}>{num(rp.totalKw, 2)}</td>
            <td className={`${td} numeral text-right font-semibold text-rose`}>{num(rp.totalRacks)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export function PhasedPanel({ result, hideMoney = false }: { result: ScenarioResult; hideMoney?: boolean }) {
  const [phases, setPhases] = useState<number[]>([...DEFAULT_PHASES]);
  const rows = useMemo(() => phasedPlan(result, phases), [result, phases]);

  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Phased deployment</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Percentage of the production sizing delivered by the end of each year, with capex staged to match.
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {phases.map((p, i) => (
          <label key={i} className="text-xs uppercase tracking-wider text-muted-foreground">
            Year {i + 1} ({Math.round(p * 100)}%)
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(p * 100)}
              onChange={(e) =>
                setPhases((prev) => prev.map((v, j) => (j === i ? Number(e.target.value) / 100 : v)))
              }
              className="mt-2 w-full accent-rose"
            />
          </label>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Year</th>
            <th className={`${th} text-right`}>Share of production</th>
            <th className={`${th} text-right`}>GPUs added</th>
            <th className={`${th} text-right`}>GPUs cumulative</th>
            {!hideMoney && <th className={`${th} text-right`}>Capex this year</th>}
            {!hideMoney && <th className={`${th} text-right`}>Capex cumulative</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className="border-b border-border last:border-0">
              <td className={td}>Year {r.year}</td>
              <td className={`${td} numeral text-right`}>{Math.round(r.pct * 100)}%</td>
              <td className={`${td} numeral text-right`}>{num(r.incrementalGpus)}</td>
              <td className={`${td} numeral text-right`}>{num(r.cumulativeGpus)}</td>
              {!hideMoney && <td className={`${td} numeral text-right`}>{inrLakh(r.stagedCapexL)}</td>}
              {!hideMoney && (
                <td className={`${td} numeral text-right text-rose`}>{inrLakh(r.cumulativeCapexL)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
