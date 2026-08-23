CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _priv boolean;
BEGIN
  -- Elevated callers: service role, postgres/superuser, or an admin session.
  _priv := (
    current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR pg_has_role(current_user, 'supabase_admin', 'member')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
  );

  IF NOT _priv THEN
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
    NEW.decided_at := OLD.decided_at;
    NEW.decided_by := OLD.decided_by;
    NEW.requested_at := OLD.requested_at;
    NEW.email := OLD.email;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;