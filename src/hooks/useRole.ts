import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { AppRole } from "@/lib/roles.functions";

export interface RoleState {
  roles: AppRole[];
  role: AppRole;
  isAdmin: boolean;
  isSales: boolean;
  loading: boolean;
  signedIn: boolean;
}

/** Roles of the signed-in user. Signed-out and unassigned users get presales. */
export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isSales = !isAdmin && roles.includes("sales");
  const role: AppRole = isAdmin ? "admin" : isSales ? "sales" : "presales";

  return { roles, role, isAdmin, isSales, loading: loading || authLoading, signedIn: !!user };
}
