import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountStatus = "pending" | "approved" | "rejected";
export type TeamRole = "admin" | "presales" | "sales";

export interface AccountRow {
  id: string;
  email: string;
  full_name: string;
  status: AccountStatus;
  is_active: boolean;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decided_by_email: string | null;
  role: TeamRole | null;
}

const statusSchema = z.enum(["pending", "approved", "rejected"]);
const roleSchema = z.enum(["admin", "presales", "sales"]);

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("user_roles").select("user_id,role");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const anyAdmin = rows.some((r) => r.role === "admin");
  const isAdmin = rows.some((r) => r.user_id === userId && r.role === "admin");
  // While the team has no admin at all, the first signed-in user may bootstrap.
  if (anyAdmin && !isAdmin) throw new Error("Administrators only.");
  return { supabaseAdmin, anyAdmin, isAdmin };
}

/** Every account with its status and role. Administrators only. */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);

    const [{ data: profiles, error }, { data: roles, error: roleErr }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id,email,full_name,status,is_active,requested_at,decided_at,decided_by")
        .order("requested_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);
    if (error) throw new Error(error.message);
    if (roleErr) throw new Error(roleErr.message);

    const byId = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));
    const roleOf = new Map<string, TeamRole>();
    for (const r of roles ?? []) roleOf.set(r.user_id as string, r.role as TeamRole);

    const rows: AccountRow[] = (profiles ?? []).map((p) => ({
      id: p.id as string,
      email: p.email as string,
      full_name: (p.full_name as string) ?? "",
      status: p.status as AccountStatus,
      is_active: p.is_active as boolean,
      requested_at: p.requested_at as string,
      decided_at: (p.decided_at as string | null) ?? null,
      decided_by: (p.decided_by as string | null) ?? null,
      decided_by_email: p.decided_by ? (byId.get(p.decided_by as string) ?? null) : null,
      role: roleOf.get(p.id as string) ?? null,
    }));

    return { rows, pending: rows.filter((r) => r.status === "pending").length };
  });

/** Count of accounts waiting for a decision. Administrators only. */
export const pendingCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { pending: count ?? 0 };
  });

/** Approve an account and grant its working role. */
export const approveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), role: roleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);

    const { data: target, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!target) throw new Error("Account not found.");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        status: "approved",
        is_active: true,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, email: target.email as string, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true };
  });

/** Reject an account. No role is granted. */
export const rejectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    return { ok: true };
  });

/** Activate or deactivate an existing account. */
export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_active: data.is_active,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Change the role of an already approved account. */
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), role: roleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await adminClient(context.userId);
    const { data: target, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!target) throw new Error("Account not found.");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, email: target.email as string, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ACCOUNT_STATUSES = statusSchema.options;
