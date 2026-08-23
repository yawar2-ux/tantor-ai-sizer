-- 1. Remove the blanket anon-readable policies
DROP POLICY IF EXISTS "Shared scenarios are publicly readable" ON public.scenarios;
DROP POLICY IF EXISTS "Changes of shared scenarios are publicly readable" ON public.scenario_changes;

REVOKE SELECT ON public.scenarios FROM anon;
REVOKE SELECT ON public.scenario_changes FROM anon;

-- 2. Token-gated read path. SECURITY DEFINER so it bypasses RLS, but it can
--    only ever return the single row whose share_token matches exactly and
--    which is still shared.
CREATE OR REPLACE FUNCTION public.get_shared_scenario(_token uuid)
RETURNS TABLE (
  id uuid,
  client text,
  opportunity text,
  round text,
  data jsonb,
  is_shared boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.client, s.opportunity, s.round, s.data, s.is_shared, s.created_at, s.updated_at
  FROM public.scenarios s
  WHERE s.share_token = _token
    AND s.is_shared = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_shared_scenario(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_scenario(uuid) TO anon, authenticated;
