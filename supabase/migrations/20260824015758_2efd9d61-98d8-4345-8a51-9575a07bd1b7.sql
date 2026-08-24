-- =====================================================================
-- 1. calibration_runs policies
-- =====================================================================
DROP POLICY IF EXISTS "Team can read calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Approved users read calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Approved users insert their own calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Owners update their own calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Owners or admins delete calibration runs" ON public.calibration_runs;

CREATE POLICY "Approved users read calibration runs"
  ON public.calibration_runs FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert their own calibration runs"
  ON public.calibration_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Owners update their own calibration runs"
  ON public.calibration_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Owners or admins delete calibration runs"
  ON public.calibration_runs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- 2. DURABLE FUNCTION EXECUTE PERMISSIONS  -- DO NOT "FIX" THESE
-- ---------------------------------------------------------------------
-- CREATE OR REPLACE / DROP of a function resets EXECUTE to PUBLIC.
-- Every future migration that creates or replaces any function below
-- MUST re-apply this exact block at the end of the same migration,
-- including the REVOKE ... FROM public (the PUBLIC pseudo-role would
-- otherwise keep the grant alive).
--
-- Intended final state:
--   get_shared_scenario(uuid)    anon YES, authenticated YES
--   has_role(uuid, text)         anon NO,  authenticated YES
--   has_role(uuid, app_role)     anon NO,  authenticated YES
--   is_approved(uuid)            anon NO,  authenticated YES
--   handle_new_user()            anon NO,  authenticated NO
--   protect_profile_privileges() anon NO,  authenticated NO
--
-- TWO RULES THAT MUST NEVER CHANGE (either would break the app):
--   * has_role and is_approved MUST keep EXECUTE for `authenticated`.
--     RLS policies call them inside the user's own session; revoking
--     this disables every row-level policy at once.
--   * get_shared_scenario MUST keep EXECUTE for `anon`. This is how a
--     client opens a read-only share link without an account. It is
--     safe: it requires an exact uuid token and returns at most one row.
-- A security lint may flag these as "public access" - that is expected
-- and intentional. Do not revoke them.
-- =====================================================================

REVOKE ALL ON FUNCTION public.get_shared_scenario(uuid) FROM public;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM public;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM public;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_shared_scenario(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;