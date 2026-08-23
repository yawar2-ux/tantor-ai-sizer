import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePresentation } from "@/state/presentation";
import { useAuth } from "@/hooks/useAuth";

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
  { to: "/admin", label: "Admin" },
];

function NavItem({ to, label, step }: { to: string; label: string; step?: number }) {
  return (
    <Link
      to={to}
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
    </Link>
  );
}

export function Sidebar() {
  const { presenting, toggle } = usePresentation();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand px-4 py-5">
      {/* Tantor wordmark — reversed (white) variant for the dark sidebar */}
      <img src={tantorLogo} alt="Tantor" className="mb-8 h-9 w-[140px] shrink-0 object-contain" />

      <nav className="flex flex-col gap-1">
        {steps.map((s) => (
          <NavItem key={s.to} {...s} />
        ))}
      </nav>

      <div className="my-5 h-px bg-brand-foreground/15" />

      <nav className="flex flex-col gap-1">
        {library.map((s) => (
          <NavItem key={s.to} {...s} />
        ))}
      </nav>

      {!presenting && (
        <>
          <div className="my-5 h-px bg-brand-foreground/15" />
          <nav className="flex flex-col gap-1">
            {extras.map((s) => (
              <NavItem key={s.to} {...s} />
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
          <Link to="/auth" className="block text-[11px] text-brand-foreground/60 underline">
            Sign in
          </Link>
        )}

        <div className="text-[11px] leading-relaxed text-brand-foreground/50">
          Tantor Gen AI Sizer
          <br />
          Translab Technologies presales
        </div>
      </div>
    </aside>
  );
}
