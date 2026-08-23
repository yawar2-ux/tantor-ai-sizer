import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ResultStrip } from "./ResultStrip";
import { RATES } from "@/engine";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ResultStrip />
        <main className="flex-1 px-8 py-8">{children}</main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-8 py-4 text-xs text-muted-foreground">
          <span>Tantor Gen AI Sizer, internal presales tool of Translab Technologies. All figures in INR.</span>
          <span className="numeral">Rates: {RATES.version}</span>
        </footer>
      </div>
    </div>
  );
}
