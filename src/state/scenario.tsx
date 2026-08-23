import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeScenario, defaultScenario, type Scenario, type ScenarioResult } from "@/engine";

const STORAGE_KEY = "tantor-sizer-scenario-v1";
const SAVED_ID_KEY = "tantor-sizer-saved-id-v1";

interface Ctx {
  scenario: Scenario;
  result: ScenarioResult;
  update: (patch: Partial<Scenario>) => void;
  reset: () => void;
  /** id of the saved scenario row this working state came from, if any */
  savedId: string | null;
  setSavedId: (id: string | null) => void;
}

const ScenarioContext = createContext<Ctx | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(() => defaultScenario());
  const [savedId, setSavedIdState] = useState<string | null>(null);

  // Local persistence today; saved scenarios move to Lovable Cloud in a later step.
  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        setScenario({ ...defaultScenario(), ...(JSON.parse(raw) as Scenario) });
      } catch {
        /* ignore malformed local state */
      }
    }
    if (typeof window !== "undefined") setSavedIdState(window.localStorage.getItem(SAVED_ID_KEY));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
  }, [scenario]);

  const value = useMemo<Ctx>(
    () => ({
      scenario,
      result: computeScenario(scenario),
      update: (patch) => setScenario((s) => ({ ...s, ...patch })),
      reset: () => {
        setScenario(defaultScenario());
        setSavedIdState(null);
        if (typeof window !== "undefined") window.localStorage.removeItem(SAVED_ID_KEY);
      },
      savedId,
      setSavedId: (id) => {
        setSavedIdState(id);
        if (typeof window === "undefined") return;
        if (id) window.localStorage.setItem(SAVED_ID_KEY, id);
        else window.localStorage.removeItem(SAVED_ID_KEY);
      },
    }),
    [scenario, savedId],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}


export function useScenario(): Ctx {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used inside ScenarioProvider");
  return ctx;
}
