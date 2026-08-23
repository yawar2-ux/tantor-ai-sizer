import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "presales" | "sales";

export interface TeamRoleRow {
  id: string;
  user_id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
}

/** Every role row on the team. Admins only. */
export const listTeamRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id,user_id,email,role,created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as TeamRoleRow[];
    const isAdmin = rows.some((r) => r.user_id === context.userId && r.role === "admin");
    if (!isAdmin) throw new Error("Admins only.");
    return { rows };
  });

/** Grant a role by email. Admins only. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ email: z.string().email(), role: z.enum(["admin", "presales", "sales"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: readErr } = await supabaseAdmin.from("user_roles").select("user_id,role");
    if (readErr) throw new Error(readErr.message);
    const isAdmin = (existing ?? []).some((r) => r.user_id === context.userId && r.role === "admin");
    if (!isAdmin) throw new Error("Admins only.");

    const email = data.email.trim().toLowerCase();
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(listErr.message);
    const target = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!target) throw new Error(`No account found for ${email}. Ask them to sign up first.`);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, email, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readErr } = await supabaseAdmin.from("user_roles").select("user_id,role");
    if (readErr) throw new Error(readErr.message);
    const isAdmin = (existing ?? []).some((r) => r.user_id === context.userId && r.role === "admin");
    if (!isAdmin) throw new Error("Admins only.");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
