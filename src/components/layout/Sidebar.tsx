import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import tantorLogo from "/tantor-logo-reversed.svg";

const steps = [
  { to: "/", label: "Home" },
  { to: "/workload", label: "Workload", step: 1 },
  { to: "/model-platform", label: "Model & Platform", step: 2 },
  { to: "/infrastructure", label: "Infrastructure", step: 3 },
  { to: "/environments", label: "Environments", step: 4 },
  { to: "/results", label: "Results", step: 5 },
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
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand px-4 py-5">
      {/* Tantor wordmark — reversed (white) variant for the dark sidebar */}
      <img
        src={tantorLogo}
        alt="Tantor"
        className="mb-8 h-9 w-[140px] shrink-0 object-contain"
      />

      <nav className="flex flex-col gap-1">
        {steps.map((s) => (
          <NavItem key={s.to} {...s} />
        ))}
      </nav>

      <div className="my-5 h-px bg-brand-foreground/15" />

      <nav className="flex flex-col gap-1">
        {extras.map((s) => (
          <NavItem key={s.to} {...s} />
        ))}
      </nav>

      <div className="mt-auto pt-6 text-[11px] leading-relaxed text-brand-foreground/50">
        Tantor Gen AI Sizer
        <br />
        Translab Technologies presales
      </div>
    </aside>
  );
}
