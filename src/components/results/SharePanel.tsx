import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getScenario, scenarioTitle, setShared, type SavedScenario } from "@/lib/scenarios";
import { useScenario } from "@/state/scenario";

/**
 * Surfaces the existing token-gated share infrastructure on Results.
 * A scenario must be saved before it can be shared.
 */
export function SharePanel() {
  const { savedId } = useScenario();
  const [row, setRow] = useState<SavedScenario | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!savedId) return setRow(null);
    try {
      setRow(await getScenario(savedId));
    } catch {
      setRow(null);
    }
  }, [savedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const url = row && typeof window !== "undefined" ? `${window.location.origin}/share/${row.share_token}` : "";

  const toggle = async (next: boolean) => {
    if (!row) return;
    setBusy(true);
    setMsg(null);
    try {
      await setShared(row.id, next);
      await refresh();
      setMsg(next ? "Share link is live." : "Share link revoked. The old link no longer opens.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not change the share state.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Copy failed. Select the link and copy it manually.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-border px-4 py-2 font-heading text-sm font-semibold text-brand transition-colors hover:border-rose"
      >
        Share results
        <span
          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            row?.is_shared ? "bg-rose/15 text-rose" : "bg-muted text-muted-foreground"
          }`}
        >
          {row?.is_shared ? "Shared" : "Not shared"}
        </span>
      </button>

      {open && (
        <div className="card-surface w-full p-5">
          {!row ? (
            <div className="text-sm">
              <h3 className="mb-2 font-heading text-base font-semibold">Save this sizing before sharing</h3>
              <p className="mb-3 text-muted-foreground">
                A share link points at a saved scenario, so the working sizing must be saved first rather than shared
                as a transient state.
              </p>
              <Link
                to="/scenarios"
                className="inline-flex rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground"
              >
                Save this sizing
              </Link>
            </div>
          ) : (
            <div className="text-sm">
              <h3 className="mb-1 font-heading text-base font-semibold">{scenarioTitle(row)}</h3>
              <p className="mb-3 text-muted-foreground">
                Anyone with this link can view these results. They cannot sign in, edit, or see your assumptions or
                rate card.
              </p>

              {row.is_shared ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      readOnly
                      value={url}
                      className="numeral min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={copy}
                      className="rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground"
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(false)}
                      className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-brand hover:border-rose disabled:opacity-60"
                    >
                      Unshare
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unsharing takes effect immediately; the link stops opening for everyone.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(true)}
                  className="rounded-md bg-rose px-4 py-2 text-sm font-semibold text-rose-foreground disabled:opacity-60"
                >
                  Create share link
                </button>
              )}

              {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
