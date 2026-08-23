import { supabase } from "@/integrations/supabase/client";
import type { Scenario } from "@/engine";

export interface SavedScenario {
  id: string;
  user_id: string;
  client: string;
  opportunity: string;
  round: string;
  data: Scenario;
  share_token: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioChange {
  id: string;
  scenario_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export function scenarioTitle(s: { client: string; opportunity: string; round: string }) {
  return [s.client, s.opportunity, s.round].filter(Boolean).join(", ") || "Untitled scenario";
}

/** Flattened field-by-field diff between two scenarios. */
export function diffScenario(a: Scenario, b: Scenario): { field: string; old: string; next: string }[] {
  const flat = (o: unknown, prefix = ""): Record<string, string> => {
    const out: Record<string, string> = {};
    if (o === null || o === undefined) return out;
    if (Array.isArray(o)) {
      o.forEach((v, i) => Object.assign(out, flat(v, `${prefix}[${i}]`)));
      return out;
    }
    if (typeof o === "object") {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        Object.assign(out, flat(v, prefix ? `${prefix}.${k}` : k));
      }
      return out;
    }
    out[prefix] = String(o);
    return out;
  };

  const fa = flat(a);
  const fb = flat(b);
  const keys = Array.from(new Set([...Object.keys(fa), ...Object.keys(fb)]));
  return keys
    .filter((k) => (fa[k] ?? "") !== (fb[k] ?? ""))
    .map((k) => ({ field: k, old: fa[k] ?? "—", next: fb[k] ?? "—" }));
}

export async function listScenarios(): Promise<SavedScenario[]> {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedScenario[];
}

export async function getScenario(id: string): Promise<SavedScenario | null> {
  const { data, error } = await supabase.from("scenarios").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as SavedScenario) ?? null;
}

export async function getSharedScenario(token: string): Promise<SavedScenario | null> {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("share_token", token)
    .eq("is_shared", true)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SavedScenario) ?? null;
}

export async function createScenario(input: {
  client: string;
  opportunity: string;
  round: string;
  data: Scenario;
}): Promise<SavedScenario> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to save scenarios.");
  const { data, error } = await supabase
    .from("scenarios")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ ...input, data: input.data as any, user_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as SavedScenario;
}

/** Re-save an existing scenario and record every changed field. */
export async function updateScenario(
  existing: SavedScenario,
  input: { client: string; opportunity: string; round: string; data: Scenario },
): Promise<SavedScenario> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to save scenarios.");

  const changes = diffScenario(existing.data, input.data);
  const meta: { field: string; old: string; next: string }[] = [];
  (["client", "opportunity", "round"] as const).forEach((k) => {
    if (existing[k] !== input[k]) meta.push({ field: k, old: existing[k], next: input[k] });
  });

  const { data, error } = await supabase
    .from("scenarios")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...input, data: input.data as any })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw error;

  const all = [...meta, ...changes];
  if (all.length) {
    await supabase.from("scenario_changes").insert(
      all.map((c) => ({
        scenario_id: existing.id,
        user_id: uid,
        field: c.field,
        old_value: c.old,
        new_value: c.next,
      })),
    );
  }
  return data as unknown as SavedScenario;
}

export async function duplicateScenario(s: SavedScenario): Promise<SavedScenario> {
  return createScenario({
    client: s.client,
    opportunity: s.opportunity,
    round: `${s.round} (copy)`.trim(),
    data: s.data,
  });
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}

export async function setShared(id: string, is_shared: boolean): Promise<void> {
  const { error } = await supabase.from("scenarios").update({ is_shared }).eq("id", id);
  if (error) throw error;
}

export async function listChanges(scenarioId: string): Promise<ScenarioChange[]> {
  const { data, error } = await supabase
    .from("scenario_changes")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as ScenarioChange[];
}
