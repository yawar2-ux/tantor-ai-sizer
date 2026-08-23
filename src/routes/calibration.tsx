import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { useAuth } from "@/hooks/useAuth";
import { num } from "@/lib/format";
import { GPUS, MODELS, PRECISIONS } from "@/engine";
import {
  activeBillions,
  addCalibrationRun,
  deleteCalibrationRun,
  impliedK,
  listCalibrationRuns,
  median,
  precisionTput,
  type CalibrationRun,
} from "@/lib/calibration";

export const Route = createFileRoute("/calibration")({
  head: () => ({
    meta: [
      { title: "Calibration | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Record measured GPU benchmarks and adopt the median implied calibration constant K.",
      },
      { property: "og:title", content: "Calibration | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Measured tokens per second against the configured calibration K." },
    ],
  }),
  component: Calibration,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const td = "px-3 py-2 text-sm";
const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";

function Calibration() {
  const { scenario, update } = useScenario();
  const { user } = useAuth();
  const [runs, setRuns] = useState<CalibrationRun[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({
    ran_on: new Date().toISOString().slice(0, 10),
    model: MODELS[0]!.name,
    gpu: GPUS[0]!.name,
    precision: PRECISIONS[0]!.name,
    measured_tps: 0,
    notes: "",
  });

  const load = () =>
    listCalibrationRuns()
      .then(setRuns)
      .catch((e: Error) => setMsg(e.message));

  useEffect(() => {
    void load();
  }, [user]);

  const withK = useMemo(
    () =>
      runs.map((r) => {
        const model = MODELS.find((m) => m.name === r.model);
        const gpu = GPUS.find((g) => g.name === r.gpu);
        const precision = PRECISIONS.find((p) => p.name === r.precision);
        const k =
          model && gpu && precision
            ? impliedK(Number(r.measured_tps), activeBillions(model), gpu.idx, precisionTput(precision))
            : 0;
        return { run: r, k };
      }),
    [runs],
  );

  const medianK = median(withK.map((w) => w.k).filter((k) => k > 0));
  const configuredK = scenario.rates.calibK;
  const drift = configuredK > 0 ? ((medianK - configuredK) / configuredK) * 100 : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addCalibrationRun({ ...draft, measured_tps: Number(draft.measured_tps) });
      setDraft((d) => ({ ...d, measured_tps: 0, notes: "" }));
      await load();
      setMsg(null);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calibration"
        title="Measured benchmarks against the sizing constant"
        intro="Engineers record what a rig actually served. Implied K = measured tokens per second x active billions / (GPU index x precision throughput). Adopt the median when the bench data settles."
      />

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">Record a benchmark</h2>
        {!user && (
          <p className="mb-3 text-sm text-muted-foreground">Sign in to record benchmarks; the table stays readable.</p>
        )}
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs text-muted-foreground">
            Date
            <input
              type="date"
              className={`${field} mt-1`}
              value={draft.ran_on}
              onChange={(e) => setDraft({ ...draft, ran_on: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Model
            <select
              className={`${field} mt-1`}
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            >
              {MODELS.map((m) => (
                <option key={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            GPU
            <select
              className={`${field} mt-1`}
              value={draft.gpu}
              onChange={(e) => setDraft({ ...draft, gpu: e.target.value })}
            >
              {GPUS.map((g) => (
                <option key={g.name}>{g.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Precision
            <select
              className={`${field} mt-1`}
              value={draft.precision}
              onChange={(e) => setDraft({ ...draft, precision: e.target.value })}
            >
              {PRECISIONS.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Measured aggregate tokens/sec
            <input
              type="number"
              step="any"
              min={0}
              className={`${field} numeral mt-1`}
              value={draft.measured_tps}
              onChange={(e) => setDraft({ ...draft, measured_tps: Number(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Notes
            <input
              className={`${field} mt-1`}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="rig, batch size, context"
            />
          </label>
          <div className="sm:col-span-2 xl:col-span-6">
            <button
              type="submit"
              disabled={busy || !user}
              className="rounded-lg bg-rose px-4 py-2 font-heading text-sm font-semibold text-rose-foreground disabled:opacity-60"
            >
              Add benchmark
            </button>
            {msg && <span className="ml-3 text-sm text-rose">{msg}</span>}
          </div>
        </form>
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Implied K</h2>
            <p className="text-xs text-muted-foreground">
              Median implied K <span className="numeral font-semibold text-brand">{num(medianK)}</span> against the
              configured <span className="numeral font-semibold">{num(configuredK)}</span>
              {medianK > 0 && (
                <span className={drift >= 0 ? " text-olive" : " text-rose"}>
                  {" "}
                  ({drift >= 0 ? "+" : ""}
                  {num(drift, 1)}%)
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={medianK <= 0}
            onClick={() => update({ rates: { ...scenario.rates, calibK: Math.round(medianK) } })}
            className="rounded-lg border border-border px-4 py-2 font-heading text-sm font-semibold text-brand transition-colors hover:border-rose disabled:opacity-50"
          >
            Adopt median K
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Date</th>
                <th className={th}>Model</th>
                <th className={th}>GPU</th>
                <th className={th}>Precision</th>
                <th className={`${th} text-right`}>Measured tok/s</th>
                <th className={`${th} text-right`}>Implied K</th>
                <th className={th}>Notes</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {withK.length === 0 && (
                <tr>
                  <td className={`${td} text-muted-foreground`} colSpan={8}>
                    No benchmarks recorded yet.
                  </td>
                </tr>
              )}
              {withK.map(({ run, k }) => (
                <tr key={run.id} className="border-b border-border last:border-0">
                  <td className={`${td} numeral`}>{run.ran_on}</td>
                  <td className={td}>{run.model}</td>
                  <td className={td}>{run.gpu}</td>
                  <td className={td}>{run.precision}</td>
                  <td className={`${td} numeral text-right`}>{num(Number(run.measured_tps))}</td>
                  <td className={`${td} numeral text-right font-semibold text-brand`}>{num(k)}</td>
                  <td className={`${td} text-muted-foreground`}>{run.notes}</td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose underline"
                      onClick={async () => {
                        await deleteCalibrationRun(run.id).catch((e: Error) => setMsg(e.message));
                        await load();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
