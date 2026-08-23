import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePresentation } from "@/state/presentation";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useServerFn } from "@tanstack/react-start";
import { pendingCount } from "@/lib/approvals.functions";

import tantorLogo from "/tantor-logo-reversed.svg";

const steps = [
  { to: "/", label: "Home" },
  { to: "/workload", label: "Workload", step: 1 },
  { to: "/model-platform", label: "Model & Platform", step: 2 },
  { to: "/infrastructure", label: "Infrastructure", step: 3 },
  { to: "/environments", label: "Environments", step: 4 },
  { to: "/results", label: "Results", step: 5 },
];

const library = [
  { to: "/scenarios", label: "Saved scenarios" },
  { to: "/compare", label: "Compare" },
];

const extras = [
  { to: "/assumptions", label: "Assumptions" },
  { to: "/calibration", label: "Calibration" },
  { to: "/admin", label: "Admin" },
  { to: "/approvals", label: "Approvals" },
];

/** Sales sees the client-facing results and exports only. */
const SALES_ALLOWED = new Set(["/", "/results", "/scenarios", "/compare"]);

function NavItem({
  to,
  label,
  step,
  badge,
  onNavigate,
}: {
  to: string;
  label: string;
  step?: number | undefined;
  badge?: number | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      activeOptions={{ exact: to === "/" }}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-foreground/70 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground data-[status=active]:bg-rose data-[status=active]:text-rose-foreground"
    >
      {step !== undefined && (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-brand-foreground/25 font-heading text-xs",
            "group-data-[status=active]:border-rose-foreground/60",
          )}
        >
          {step}
        </span>
      )}
      <span className={cn("font-heading", step === undefined && "pl-9")}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto rounded-full bg-rose px-2 py-0.5 font-heading text-[10px] font-semibold text-rose-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { presenting, toggle } = usePresentation();
  const { user, signOut } = useAuth();
  const { isSales, isAdmin } = useRole();
  const countPending = useServerFn(pendingCount);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(() => {
    if (!isAdmin) return;
    countPending()
      .then((r) => setPending(r.pending))
      .catch(() => setPending(0));
  }, [isAdmin, countPending]);

  useEffect(() => {
    refreshPending();
    const onEvent = (e: Event) => setPending((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener("tantor:pending", onEvent);
    return () => window.removeEventListener("tantor:pending", onEvent);
  }, [refreshPending]);

  const visible = (to: string) => (isSales ? SALES_ALLOWED.has(to) : true);
  const extrasVisible = extras.filter((e) => visible(e.to) && (e.to !== "/approvals" || isAdmin));

  return (
    <>
      <nav className="flex flex-col gap-1">
        {steps.filter((s) => visible(s.to)).map((s) => (
          <NavItem key={s.to} {...s} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="my-5 h-px bg-brand-foreground/15" />

      <nav className="flex flex-col gap-1">
        {library.filter((s) => visible(s.to)).map((s) => (
          <NavItem key={s.to} {...s} onNavigate={onNavigate} />
        ))}
      </nav>

      {!presenting && extrasVisible.length > 0 && (
        <>
          <div className="my-5 h-px bg-brand-foreground/15" />
          <nav className="flex flex-col gap-1">
            {extrasVisible.map((s) => (
              <NavItem
                key={s.to}
                {...s}
                badge={s.to === "/admin" || s.to === "/approvals" ? pending : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto space-y-3 pt-6">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-left font-heading text-xs transition-colors",
            presenting
              ? "border-rose bg-rose text-rose-foreground"
              : "border-brand-foreground/25 text-brand-foreground/80 hover:border-rose",
          )}
        >
          Presentation mode: {presenting ? "ON" : "off"}
        </button>

        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="block w-full truncate text-left text-[11px] text-brand-foreground/60 underline"
          >
            Sign out ({user.email})
          </button>
        ) : (
          <Link to="/auth" onClick={onNavigate} className="block text-[11px] text-brand-foreground/60 underline">
            Sign in
          </Link>
        )}

        <div className="text-[11px] leading-relaxed text-brand-foreground/50">
          Tantor Gen AI Sizer
          <br />
          Translab Technologies presales
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop and wide tablet */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand px-4 py-5 lg:flex">
        <img src={tantorLogo} alt="Tantor" className="mb-8 h-9 w-[140px] shrink-0 object-contain" />
        <NavBody />
      </aside>

      {/* Tablet and phone */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-brand px-4 py-2 lg:hidden">
        <img src={tantorLogo} alt="Tantor" className="h-7 w-[112px] object-contain" />
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-brand-foreground/30 px-3 py-1.5 font-heading text-xs text-brand-foreground"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[52px] bottom-0 z-40 flex flex-col overflow-y-auto bg-brand px-4 py-4 lg:hidden"
        >
          <NavBody onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
