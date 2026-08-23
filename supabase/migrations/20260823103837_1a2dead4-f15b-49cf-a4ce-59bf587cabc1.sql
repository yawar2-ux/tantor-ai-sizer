CREATE TABLE public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client text NOT NULL DEFAULT '',
  opportunity text NOT NULL DEFAULT '',
  round text NOT NULL DEFAULT '',
  data jsonb NOT NULL,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX scenarios_share_token_key ON public.scenarios(share_token);
CREATE INDEX scenarios_user_id_idx ON public.scenarios(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios TO authenticated;
GRANT SELECT ON public.scenarios TO anon;
GRANT ALL ON public.scenarios TO service_role;

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own scenarios" ON public.scenarios
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shared scenarios are publicly readable" ON public.scenarios
  FOR SELECT TO anon, authenticated USING (is_shared = true);

CREATE TABLE public.scenario_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scenario_changes_scenario_idx ON public.scenario_changes(scenario_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.scenario_changes TO authenticated;
GRANT SELECT ON public.scenario_changes TO anon;
GRANT ALL ON public.scenario_changes TO service_role;

ALTER TABLE public.scenario_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own scenario changes" ON public.scenario_changes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Changes of shared scenarios are publicly readable" ON public.scenario_changes
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.scenarios s WHERE s.id = scenario_id AND s.is_shared = true)
  );

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();