DROP POLICY IF EXISTS "Team can read calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Users insert their own calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Owners or admins update calibration runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Owners or admins delete calibration runs" ON public.calibration_runs;

CREATE POLICY "Approved users read calibration runs"
ON public.calibration_runs FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert their own calibration runs"
ON public.calibration_runs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Owners update their own calibration runs"
ON public.calibration_runs FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins delete calibration runs"
ON public.calibration_runs FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));