import { supabase } from "@/integrations/supabase/client";

export interface SizingEvent {
  id: string;
  model: string;
  gpu: string;
  precision: string;
  prod_gpus: number;
  tco3_l: number;
  created_at: string;
}

/** Fire-and-forget usage log. Silently ignored when signed out. */
export async function logSizing(e: {
  model: string;
  gpu: string;
  precision: string;
  prodGpus: number;
  tco3L: number;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("sizing_events").insert({
    user_id: auth.user.id,
    model: e.model,
    gpu: e.gpu,
    precision: e.precision,
    prod_gpus: Math.round(e.prodGpus),
    tco3_l: Number(e.tco3L.toFixed(2)),
  });
}

/** Admin-only read; RLS returns nothing for other roles. */
export async function listSizingEvents(limit = 1000): Promise<SizingEvent[]> {
  const { data, error } = await supabase
    .from("sizing_events")
    .select("id,model,gpu,precision,prod_gpus,tco3_l,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SizingEvent[];
}

export function countBy<T extends string>(rows: { [k: string]: unknown }[], key: string): [T, number][] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "—");
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]) as [T, number][];
}
