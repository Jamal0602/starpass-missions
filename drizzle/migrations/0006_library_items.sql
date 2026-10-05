CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read library" ON public.library_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins add library" ON public.library_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins edit library" ON public.library_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete library" ON public.library_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.library_items ADD CONSTRAINT library_url_http CHECK (url ~ '^https?://');