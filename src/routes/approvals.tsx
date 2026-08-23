import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRole } from "@/hooks/useRole";
import {
  approveAccount,
  listAccounts,
  rejectAccount,
  setAccountActive,
  setAccountRole,
  type AccountRow,
  type AccountStatus,
  type TeamRole,
} from "@/lib/approvals.functions";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Administrator review of access requests to the Tantor Gen AI Sizer, with roles and deactivation.",
      },
      { property: "og:title", content: "Approvals | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Approve, reject and deactivate Tantor sizer accounts." },
    ],
  }),
  component: Approvals,
});

const th = "px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground";
const td = "px-3 py-2 text-sm align-top";
const field =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function waitingFor(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

const TABS: { key: AccountStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function Approvals() {
  const { isAdmin, loading: roleLoading } = useRole();
  const load = useServerFn(listAccounts);
  const approve = useServerFn(approveAccount);
  const reject = useServerFn(rejectAccount);
  const setActive = useServerFn(setAccountActive);
  const setRole = useServerFn(setAccountRole);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [tab, setTab] = useState<AccountStatus>("pending");
  const [choice, setChoice] = useState<Record<string, TeamRole>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await load();
      setRows(r.rows);
      setMsg(null);
      window.dispatchEvent(new CustomEvent("tantor:pending", { detail: r.pending }));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (roleLoading) return <p className="text-sm text-muted-foreground">Checking your access…</p>;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Approvals" intro="Access requests and account status." />
        <section className="card-surface p-5">
          <h2 className="mb-2 text-lg font-semibold">Administrators only</h2>
          <p className="text-sm text-muted-foreground">
            Your account does not hold the administrator role. Ask an existing administrator to grant it.
          </p>
        </section>
      </div>
    );
  }

  const visible = rows.filter((r) => r.status === tab);
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Approvals"
        intro="New accounts stay locked until you approve them here. Approving also sets the working role, and deactivating an account revokes access immediately at the database level."
      />

      <section className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "rounded-lg bg-rose px-3 py-1.5 font-heading text-xs font-semibold text-rose-foreground"
                  : "rounded-lg border border-border px-3 py-1.5 font-heading text-xs text-muted-foreground"
              }
            >
              {t.label}
              {t.key === "pending" && pending > 0 && (
                <span className="ml-2 rounded-full bg-rose px-1.5 py-0.5 text-[10px] text-rose-foreground">
                  {pending}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-auto text-xs text-muted-foreground underline"
          >
            Refresh
          </button>
        </div>

        {msg && <p className="mb-3 text-sm text-rose">{msg}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Requested</th>
                <th className={th}>{tab === "pending" ? "Waiting" : "Decision"}</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td className={`${td} text-muted-foreground`} colSpan={5}>
                    Nothing here.
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className={td}>
                    {r.full_name || "—"}
                    {!r.is_active && <span className="ml-2 text-[11px] text-rose">deactivated</span>}
                  </td>
                  <td className={td}>{r.email}</td>
                  <td className={`${td} numeral`}>{dateFmt.format(new Date(r.requested_at))}</td>
                  <td className={`${td} text-muted-foreground`}>
                    {tab === "pending" ? (
                      waitingFor(r.requested_at)
                    ) : (
                      <>
                        {r.decided_by_email ?? "—"}
                        {r.decided_at && (
                          <span className="block numeral text-[11px]">
                            {dateTimeFmt.format(new Date(r.decided_at))}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    {r.status === "pending" ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <select
                          className={field}
                          value={choice[r.id] ?? "presales"}
                          onChange={(e) => setChoice({ ...choice, [r.id]: e.target.value as TeamRole })}
                        >
                          <option value="presales">presales</option>
                          <option value="sales">sales</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => approve({ data: { id: r.id, role: choice[r.id] ?? "presales" } }))}
                          className="rounded-lg bg-rose px-3 py-1.5 font-heading text-xs font-semibold text-rose-foreground disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => reject({ data: { id: r.id } }))}
                          className="rounded-lg border border-border px-3 py-1.5 font-heading text-xs disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <select
                          className={field}
                          value={r.role ?? "presales"}
                          onChange={(e) => void run(() => setRole({ data: { id: r.id, role: e.target.value as TeamRole } }))}
                        >
                          <option value="presales">presales</option>
                          <option value="sales">sales</option>
                          <option value="admin">admin</option>
                        </select>
                        {r.status === "approved" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(() => setActive({ data: { id: r.id, is_active: !r.is_active } }))}
                            className="rounded-lg border border-border px-3 py-1.5 font-heading text-xs disabled:opacity-60"
                          >
                            {r.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                        {r.status === "rejected" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(() => approve({ data: { id: r.id, role: r.role ?? "presales" } }))}
                            className="rounded-lg bg-rose px-3 py-1.5 font-heading text-xs font-semibold text-rose-foreground disabled:opacity-60"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    )}
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
