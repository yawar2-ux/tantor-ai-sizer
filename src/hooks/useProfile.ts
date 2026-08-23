import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ProfileStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  status: ProfileStatus;
  is_active: boolean;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
}

/** The signed-in user's approval profile. */
export function useProfile(): ProfileState {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void supabase
      .from("profiles")
      .select("id,email,full_name,status,is_active,requested_at,decided_at,decided_by")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data as unknown as Profile) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { profile, loading: loading || authLoading, refresh };
}
