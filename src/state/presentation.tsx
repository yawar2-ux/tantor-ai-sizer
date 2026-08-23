import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KEY = "tantor-presentation-mode";

interface Ctx {
  presenting: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

const PresentationContext = createContext<Ctx | null>(null);

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setPresenting(window.localStorage.getItem(KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, presenting ? "1" : "0");
  }, [presenting]);

  const value = useMemo<Ctx>(
    () => ({ presenting, toggle: () => setPresenting((p) => !p), set: setPresenting }),
    [presenting],
  );

  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>;
}

export function usePresentation(): Ctx {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error("usePresentation must be used inside PresentationProvider");
  return ctx;
}
