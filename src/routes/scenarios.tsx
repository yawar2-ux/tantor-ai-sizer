import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useScenario } from "@/state/scenario";
import {
  createScenario,
  deleteScenario,
  duplicateScenario,
  listChanges,
  listScenarios,
  scenarioTitle,
  setShared,
  updateScenario,
  type SavedScenario,
  type ScenarioChange,
} from "@/lib/scenarios";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Saved scenarios | Tantor Gen AI Sizer" },
      {
        name: "description",
        content: "Named saves per client, opportunity and round, with share links and a change history.",
      },
      { property: "og:title", content: "Saved scenarios | Tantor Gen AI Sizer" },
      { property: "og:description", content: "Save, load, duplicate and share Tantor sizing scenarios." },
    ],
  }),
  component: ScenariosPage,
});

const field =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-rose focus:ring-2 focus:ring-rose/25";

function ScenariosPage() {
  const { user, loading } = useAuth();
  const { scenario, update } = useScenario();
  const [rows, setRows] = useState<SavedScenario[]>([]);
  const [client, setClient] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [round, setRound] = useState("Round 1");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [changes, setChanges] = useState<ScenarioChange[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRows(await listScenarios());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load scenarios.");
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!user) {
    return (
      <div className="max-w-lg">
        <PageHeader eyebrow="Saved scenarios" title="Sign in to save scenarios" />
        <p className="mb-4 text-sm text-muted-foreground">
          Named saves, share links, comparison and change history need an account.
        </p>
        <Link to="/auth" className="rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground">
          Go to sign in
        </Link>
      </div>
    );
  }

  const save = async () => {
    setMsg(null);
    try {
      const existing = rows.find((r) => r.id === activeId);
      if (existing) {
        await updateScenario(existing, { client, opportunity, round, data: scenario });
        setMsg("Scenario re-saved; changes recorded.");
        setChanges(await listChanges(existing.id));
      } else {
        const created = await createScenario({ client, opportunity, round, data: scenario });
        setActiveId(created.id);
        setMsg("Scenario saved.");
      }
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const load = async (row: SavedScenario) => {
    update(row.data);
    setActiveId(row.id);
    setClient(row.client);
    setOpportunity(row.opportunity);
    setRound(row.round);
    setChanges(await listChanges(row.id));
    setMsg(`Loaded "${scenarioTitle(row)}" into the sizer.`);
  };

  const shareUrl = (row: SavedScenario) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/share/${row.share_token}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Saved scenarios"
        title="Client, opportunity, round"
        intro="Save the current sizer state under a named opportunity, reload it later, duplicate it for a variant, or share a read-only link with the client."
      />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-heading text-lg">{activeId ? "Re-save loaded scenario" : "Save current scenario"}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Client</label>
            <input className={field} value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Opportunity</label>
            <input className={field} value={opportunity} onChange={(e) => setOpportunity(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Round</label>
            <input className={field} value={round} onChange={(e) => setRound(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={save} className="rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground">
            {activeId ? "Re-save" : "Save"}
          </button>
          {activeId && (
            <button
              onClick={() => {
                setActiveId(null);
                setChanges([]);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Save as new instead
            </button>
          )}
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg">Saved list</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse bg-surface">
            <thead className="bg-muted/40">
              <tr>
                {["Scenario", "Updated", "Share", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={4}>
                    Nothing saved yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 text-sm">
                    {scenarioTitle(row)}
                    {activeId === row.id && <span className="ml-2 rounded bg-rose/15 px-2 py-0.5 text-[11px] text-rose">loaded</span>}
                  </td>
                  <td className="numeral px-3 py-2 text-sm text-muted-foreground">
                    {new Date(row.updated_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={row.is_shared}
                        onChange={async (e) => {
                          await setShared(row.id, e.target.checked);
                          await refresh();
                        }}
                      />
                      shared
                    </label>
                    {row.is_shared && (
                      <button
                        className="mt-1 text-xs text-rose underline"
                        onClick={() => void navigator.clipboard.writeText(shareUrl(row))}
                      >
                        Copy read-only link
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button className="rounded border border-border px-2 py-1" onClick={() => void load(row)}>
                        Load
                      </button>
                      <button
                        className="rounded border border-border px-2 py-1"
                        onClick={async () => {
                          await duplicateScenario(row);
                          await refresh();
                        }}
                      >
                        Duplicate
                      </button>
                      <button
                        className="rounded border border-border px-2 py-1 text-rose"
                        onClick={async () => {
                          await deleteScenario(row.id);
                          if (activeId === row.id) setActiveId(null);
                          await refresh();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeId && (
        <section>
          <h2 className="mb-3 font-heading text-lg">What changed</h2>
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded edits for this scenario yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse bg-surface">
                <thead className="bg-muted/40">
                  <tr>
                    {["Field", "Old", "New", "When"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{c.field}</td>
                      <td className="numeral px-3 py-2 text-sm text-muted-foreground">{c.old_value}</td>
                      <td className="numeral px-3 py-2 text-sm text-rose">{c.new_value}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
