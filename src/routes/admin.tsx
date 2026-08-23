import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScenario } from "@/state/scenario";
import { useRole } from "@/hooks/useRole";
import { inrLakh, num } from "@/lib/format";
import { countBy, listSizingEvents, type SizingEvent } from "@/lib/analytics";
import { grantRole, listTeamRoles, revokeRole, type AppRole, type TeamRoleRow } from "@/lib/roles.functions";
import { DEFAULT_COMMERCIAL, type Rates } from "@/engine";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Rate card editing, commercial terms, team roles and usage analytics for the Tantor sizer.",
      },
      { property: "og:title", content: "Admin | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Rate card versions, discounts, GST, roles and sizing analytics." },
    ],
  }),
  component: Admin,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";
const td = "px-3 py-2 text-sm";
const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";

const RATE_GROUPS: { title: string; keys: [keyof Rates, string][] }[] = [
  {
    title: "Throughput and sizing",
    keys: [
      ["peakFactor", "Peak factor"],
      ["servingEff", "Serving efficiency"],
      ["headroom", "Headroom"],
      ["ancillary", "Ancillary"],
      ["schedOverhead", "Scheduling overhead"],
      ["haGpus", "HA GPUs"],
      ["calibK", "Calibration K"],
      ["streamsPerGpu", "Streams per GPU"],
      ["concRatio", "Concurrency ratio"],
      ["inflightLatency", "In-flight latency streams"],
      ["prefillMult", "Prefill multiplier"],
      ["weightOverhead", "Weight overhead"],
      ["migPartitions", "MIG partitions"],
      ["oversub", "vCPU oversubscription"],
    ],
  },
  {
    title: "Commercials and run cost",
    keys: [
      ["fx", "INR per USD"],
      ["tariff", "Power tariff, INR per kWh"],
      ["utilisation", "Utilisation"],
      ["hoursMonth", "Hours per month"],
      ["cloudUplift", "Cloud uplift"],
      ["committedFactor", "Committed-use factor"],
      ["amcPct", "AMC percent of hardware"],
      ["manpowerL", "Manpower, L per year"],
      ["facilitiesL", "Facilities, L per year"],
      ["installPct", "Installation percent"],
      ["contPct", "Contingency percent"],
      ["implOneL", "Implementation one-off, L"],
      ["nvaieLperGpu", "NVIDIA AI Enterprise, L per GPU"],
      ["k8sLicLperNode", "Kubernetes licence, L per node"],
      ["applianceLperTB", "Storage appliance, L per TB"],
      ["ethPerNodeL", "Ethernet, L per node"],
      ["fabricBaseL", "Fabric base, L"],
      ["fabricPerNodeL", "Fabric, L per node"],
      ["refresh", "Refresh factor"],
    ],
  },
  {
    title: "Corpus, index and storage",
    keys: [
      ["workDays", "Working days"],
      ["docsPerUser", "Documents per user"],
      ["docMB", "MB per document"],
      ["embedDims", "Embedding dimensions"],
      ["chunkTokens", "Tokens per chunk"],
      ["bytesPerToken", "Bytes per token"],
      ["logOverhead", "Log overhead"],
      ["indexOverhead", "Index overhead"],
      ["growth", "Growth factor"],
      ["raid", "RAID factor"],
      ["ramMult", "RAM multiplier"],
      ["osReserve", "OS reserve, GB"],
      ["cloudCpuHr", "Cloud CPU, USD per hour"],
      ["k8sOverhead", "Kubernetes overhead"],
    ],
  },
];

function Admin() {
  const { isAdmin, loading, signedIn } = useRole();

  if (loading) return <p className="text-sm text-muted-foreground">Checking your access…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Rate card, commercials, roles and usage"
        intro="Everything the presales team shares: the rate card and its version stamp, negotiation terms applied to on-premise capex, who holds which role, and what has been sized."
      />
      {!isAdmin ? (
        <section className="card-surface p-5">
          <h2 className="mb-2 text-lg font-semibold">Admins only</h2>
          <p className="text-sm text-muted-foreground">
            {signedIn
              ? "Your account does not hold the admin role. Ask an existing admin to grant it."
              : "Sign in with an admin account to edit the rate card and manage roles."}
          </p>
        </section>
      ) : (
        <>
          <RateCard />
          <Commercials />
          <RoleAdmin />
          <UsageAnalytics />
        </>
      )}
    </div>
  );
}

function RateCard() {
  const { scenario, update } = useScenario();
  const rates = scenario.rates;

  const setRate = (k: keyof Rates, v: string) =>
    update({ rates: { ...rates, [k]: k === "version" ? v : Number(v) } as Rates });

  return (
    <section className="card-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Rate card</h2>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Version stamp
          <input
            className={`${field} mt-1 w-48`}
            value={rates.version}
            onChange={(e) => setRate("version", e.target.value)}
          />
        </label>
      </div>
      <div className="space-y-6">
        {RATE_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 font-heading text-sm font-semibold text-brand">{g.title}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {g.keys.map(([k, label]) => (
                <label key={String(k)} className="text-xs text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    step="any"
                    className={`${field} numeral mt-1`}
                    value={String(rates[k] ?? 0)}
                    onChange={(e) => setRate(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        The version stamp shows in the footer of every page and in the Excel pack.
      </p>
    </section>
  );
}

function Commercials() {
  const { scenario, result, update } = useScenario();
  const c = scenario.commercial ?? DEFAULT_COMMERCIAL;
  const { cost } = result;

  const set = (k: keyof typeof c, v: string) => update({ commercial: { ...c, [k]: Number(v) || 0 } });

  const preOpex = cost.opexLyr - cost.licenceLyr - cost.supportLyr;
  const rows: [string, string, string][] = [
    ["Capex", inrLakh(cost.capexL), inrLakh(cost.capexNetL)],
    ["Discount", "—", `− ${inrLakh(cost.discountL)}`],
    ["GST", "—", inrLakh(cost.gstL)],
    ["Capex payable", inrLakh(cost.capexL), inrLakh(cost.capexPayableL)],
    ["Opex per year", inrLakh(preOpex), inrLakh(cost.opexLyr)],
    ["Three-year TCO", inrLakh(cost.capexL + 3 * preOpex), inrLakh(cost.tco3L)],
  ];

  return (
    <section className="card-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Commercial terms</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["discountPct", "Discount percent on capex"],
            ["gstPct", "GST percent"],
            ["licenceLyr", "Tantor licence, L per year"],
            ["supportLyr", "Tantor support, L per year"],
          ] as [keyof typeof c, string][]
        ).map(([k, label]) => (
          <label key={k} className="text-xs text-muted-foreground">
            {label}
            <input
              type="number"
              step="any"
              className={`${field} numeral mt-1`}
              value={String(c[k])}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Line</th>
              <th className={`${th} text-right`}>Pre-negotiation</th>
              <th className={`${th} text-right`}>Post-negotiation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className={td}>{k}</td>
                <td className={`${td} numeral text-right text-muted-foreground`}>{a}</td>
                <td className={`${td} numeral text-right font-semibold text-rose`}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Licence and support are added to opex only when set above; every downstream page, chart and export uses the
        post-negotiation figures.
      </p>
    </section>
  );
}

function RoleAdmin() {
  const list = useServerFn(listTeamRoles);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);

  const [rows, setRows] = useState<TeamRoleRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("presales");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    list()
      .then((r) => {
        setRows(r.rows);
        setMsg(null);
      })
      .catch((e: Error) => setMsg(e.message));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await grant({ data: { email, role } });
      setEmail("");
      await load();
      setMsg("Role granted.");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Roles</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Presales gets everything except admin. Sales sees Results and exports only. Admin sees everything.
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          Account email
          <input
            type="email"
            required
            className={`${field} mt-1 w-64`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@translab.io"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Role
          <select className={`${field} mt-1 w-40`} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            <option value="presales">presales</option>
            <option value="sales">sales</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-rose px-4 py-2 font-heading text-sm font-semibold text-rose-foreground disabled:opacity-60"
        >
          Grant role
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-rose">{msg}</p>}

      {(
        <table className="mt-4 w-full">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Email</th>
              <th className={th}>Role</th>
              <th className={`${th} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={`${td} text-muted-foreground`} colSpan={3}>
                  No roles assigned yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className={td}>{r.email ?? r.user_id}</td>
                <td className={td}>{r.role}</td>
                <td className={`${td} text-right`}>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose underline"
                    onClick={async () => {
                      await revoke({ data: { id: r.id } }).catch((e: Error) => setMsg(e.message));
                      await load();
                    }}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function UsageAnalytics() {
  const [events, setEvents] = useState<SizingEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listSizingEvents()
      .then(setEvents)
      .catch((e: Error) => setErr(e.message));
  }, []);

  const byModel = useMemo(() => countBy(events, "model"), [events]);
  const byGpu = useMemo(() => countBy(events, "gpu"), [events]);

  const bars = (data: [string, number][]) => {
    const max = Math.max(1, ...data.map((d) => d[1]));
    return (
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No sizings logged yet.</p>}
        {data.map(([label, count]) => (
          <div key={label} className="grid grid-cols-[150px_1fr_48px] items-center gap-3">
            <span className="truncate text-sm">{label}</span>
            <div className="h-5 rounded-md bg-background">
              <div
                className="h-5 rounded-md bg-brand"
                style={{ width: `${Math.max(2, (count / max) * 100)}%` }}
              />
            </div>
            <span className="numeral text-right text-sm font-semibold">{num(count)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Usage analytics</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Sizings run by the team, {num(events.length)} logged. {err ?? ""}
      </p>
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-brand">By model</h3>
          {bars(byModel)}
        </div>
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-brand">By GPU</h3>
          {bars(byGpu)}
        </div>
      </div>
    </section>
  );
}
