DROP POLICY "Signed-in users view submissions" ON public.activity_submissions;
CREATE POLICY "Own or admin view submissions" ON public.activity_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.activity_counts()
RETURNS TABLE(profile_id uuid, total integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT profile_id, count(*)::int FROM public.activity_submissions WHERE auth.uid() IS NOT NULL GROUP BY profile_id
$$;
REVOKE EXECUTE ON FUNCTION public.activity_counts() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.activity_counts() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_if_director() FROM anon, public, authenticated;