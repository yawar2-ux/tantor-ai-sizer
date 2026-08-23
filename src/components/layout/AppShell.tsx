import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ResultStrip } from "./ResultStrip";
import { usePresentation } from "@/state/presentation";
import { useScenario } from "@/state/scenario";

export function AppShell({ children }: { children: ReactNode }) {
  const { presenting, toggle } = usePresentation();
  const { scenario } = useScenario();

  return (
    <div className={presenting ? "min-h-screen border-4 border-rose" : "min-h-screen"}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pt-[52px] lg:pt-0">
          {presenting && (
            <div className="flex items-center justify-between gap-3 bg-rose px-4 py-1.5 text-xs font-semibold text-rose-foreground md:px-8">
              <span>Presentation mode: assumptions, admin, cost build-up and rate figures are hidden.</span>
              <button type="button" onClick={toggle} className="underline">
                Turn off
              </button>
            </div>
          )}
          <ResultStrip />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-4 text-xs text-muted-foreground md:px-8">
            <span>
              Internal presales tool. Rates: <span className="numeral">{scenario.rates.version}</span>. Planning estimates, not
              quotations.
            </span>
            <span>Translab Technologies. All figures in INR.</span>
          </footer>
        </div>

      </div>
    </div>
  );
}
