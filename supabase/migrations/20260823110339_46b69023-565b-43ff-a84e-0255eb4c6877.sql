CREATE TYPE public.app_role AS ENUM ('admin', 'presales', 'sales');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.calibration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ran_on date NOT NULL DEFAULT current_date,
  model text NOT NULL,
  gpu text NOT NULL,
  precision text NOT NULL,
  measured_tps numeric NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calibration_runs TO authenticated;
GRANT ALL ON public.calibration_runs TO service_role;
ALTER TABLE public.calibration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read calibration runs"
  ON public.calibration_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert their own calibration runs"
  ON public.calibration_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or admins update calibration runs"
  ON public.calibration_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners or admins delete calibration runs"
  ON public.calibration_runs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_calibration_runs_updated_at
  BEFORE UPDATE ON public.calibration_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sizing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model text NOT NULL,
  gpu text NOT NULL,
  precision text NOT NULL,
  prod_gpus integer NOT NULL DEFAULT 0,
  tco3_l numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sizing_events TO authenticated;
GRANT ALL ON public.sizing_events TO service_role;
ALTER TABLE public.sizing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users log their own sizings"
  ON public.sizing_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read the sizing log"
  ON public.sizing_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));