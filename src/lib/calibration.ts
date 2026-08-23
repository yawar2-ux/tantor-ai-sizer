import { supabase } from "@/integrations/supabase/client";
import type { Model, Precision } from "@/engine";

export interface CalibrationRun {
  id: string;
  user_id: string;
  ran_on: string;
  model: string;
  gpu: string;
  precision: string;
  measured_tps: number;
  notes: string;
  created_at: string;
}

export interface CalibrationDraft {
  ran_on: string;
  model: string;
  gpu: string;
  precision: string;
  measured_tps: number;
  notes: string;
}

/**
 * Implied calibration constant for one measured run:
 * K = measured tokens/sec x active billions / (index x precision throughput factor).
 */
export function impliedK(measuredTps: number, activeB: number, idx: number, precisionTput: number): number {
  if (idx <= 0 || precisionTput <= 0) return 0;
  return (measuredTps * activeB) / (idx * precisionTput);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function activeBillions(model: Model): number {
  return model.activeB;
}

export function precisionTput(precision: Precision): number {
  return precision.tput;
}

export async function listCalibrationRuns(): Promise<CalibrationRun[]> {
  const { data, error } = await supabase
    .from("calibration_runs")
    .select("*")
    .order("ran_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CalibrationRun[];
}

export async function addCalibrationRun(draft: CalibrationDraft): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to record a benchmark.");
  const { error } = await supabase.from("calibration_runs").insert({ ...draft, user_id: auth.user.id });
  if (error) throw error;
}

export async function deleteCalibrationRun(id: string): Promise<void> {
  const { error } = await supabase.from("calibration_runs").delete().eq("id", id);
  if (error) throw error;
}
