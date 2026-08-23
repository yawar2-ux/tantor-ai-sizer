import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ResultStrip } from "./ResultStrip";
import { RATES } from "@/engine";
import { usePresentation } from "@/state/presentation";

export function AppShell({ children }: { children: ReactNode }) {
  const { presenting, toggle } = usePresentation();

  return (
    <div className={presenting ? "min-h-screen border-4 border-rose" : "min-h-screen"}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {presenting && (
            <div className="flex items-center justify-between gap-3 bg-rose px-8 py-1.5 text-xs font-semibold text-rose-foreground">
              <span>Presentation mode: assumptions, admin, cost build-up and rate figures are hidden.</span>
              <button type="button" onClick={toggle} className="underline">
                Turn off
              </button>
            </div>
          )}
          <ResultStrip />
          <main className="flex-1 px-8 py-8">{children}</main>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-8 py-4 text-xs text-muted-foreground">
            <span>Tantor Gen AI Sizer, internal presales tool of Translab Technologies. All figures in INR.</span>
            {!presenting && <span className="numeral">Rates: {RATES.version}</span>}
          </footer>
        </div>
      </div>
    </div>
  );
}
