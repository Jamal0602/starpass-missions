CREATE TABLE public.activity_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text CHECK (link_url IS NULL OR link_url ~* '^https?://'),
  mission_day integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_posters TO authenticated;
GRANT ALL ON public.activity_posters TO service_role;
ALTER TABLE public.activity_posters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read posters" ON public.activity_posters FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert posters" ON public.activity_posters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update posters" ON public.activity_posters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete posters" ON public.activity_posters FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.activity_posters (title, subtitle, image_url, link_url, mission_day, sort_order) VALUES
('Mission: Orbit','The Satellite Challenge','/__l5e/assets-v1/8d522252-c0d2-4558-8204-1b72c1ed81bf/poster-day1.jpg','https://q.me-qr.com/d144n613',1,1),
('Guess the Cosmic Object','Astronomy & Astrophysics','/__l5e/assets-v1/10244bd1-fab8-4e1f-9a69-299dcbffd318/poster-day2.jpg','https://qr-codes.io/byfPJX',2,2),
('Rocket Science','Build. Configure. Launch.','/__l5e/assets-v1/15b68f8f-3fd6-452f-b919-967ff67b47ee/poster-day3.jpg','https://qrfy.io/kETO7290G9',3,3),
('Astronaut Mode: On','Land your spacecraft on Kepler-X','/__l5e/assets-v1/9776084c-b84b-4276-9016-1e59178e97ea/poster-day4.jpg','https://q.me-qr.com/smw9bxy3',4,4);

DROP POLICY IF EXISTS "Pioneers publish own posts" ON public.posts;
CREATE POLICY "Members publish own posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = posts.profile_id AND p.user_id = auth.uid()));