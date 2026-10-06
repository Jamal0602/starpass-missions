ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text, ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS goals text, ADD COLUMN IF NOT EXISTS availability text;
GRANT SELECT (interests, languages, location, education, goals, availability) ON public.profiles TO authenticated;
GRANT UPDATE (interests, languages, location, education, goals, availability) ON public.profiles TO authenticated;
GRANT INSERT (image_url) ON public.posts TO authenticated;
GRANT SELECT (image_url) ON public.posts TO authenticated;

CREATE TABLE public.mission_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_day integer NOT NULL REFERENCES public.mission_schedules(mission_day),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, mission_day)
);
GRANT SELECT, INSERT, UPDATE ON public.mission_feedback TO authenticated;
GRANT ALL ON public.mission_feedback TO service_role;
ALTER TABLE public.mission_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read feedback" ON public.mission_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));
CREATE POLICY "Stamped users give feedback" ON public.mission_feedback FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.collected_badges b WHERE b.profile_id = mission_feedback.profile_id AND b.mission_day = mission_feedback.mission_day));
CREATE POLICY "Own feedback update" ON public.mission_feedback FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_profile_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.is_pro AND coalesce(array_length(NEW.skills, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Pioneer status requires at least 2 skills';
  END IF;
  IF length(coalesce(NEW.bio,'')) > 500 OR length(coalesce(NEW.callsign,'')) > 40
     OR length(coalesce(NEW.location,'')) > 80 OR length(coalesce(NEW.education,'')) > 120
     OR length(coalesce(NEW.goals,'')) > 300 OR length(coalesce(NEW.availability,'')) > 80
     OR length(coalesce(NEW.avatar_url,'')) > 500 THEN
    RAISE EXCEPTION 'Field too long';
  END IF;
  IF coalesce(array_length(NEW.skills,1),0) > 15 OR coalesce(array_length(NEW.interests,1),0) > 15
     OR coalesce(array_length(NEW.languages,1),0) > 10 THEN RAISE EXCEPTION 'Too many items'; END IF;
  IF (NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url !~* '^https?://') OR
     (NEW.github_url IS NOT NULL AND NEW.github_url !~* '^https?://') OR
     (NEW.instagram_url IS NOT NULL AND NEW.instagram_url !~* '^https?://') OR
     (NEW.avatar_url IS NOT NULL AND NEW.avatar_url !~* '^https?://') THEN
    RAISE EXCEPTION 'Links must start with http:// or https://';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.validate_post()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.title := trim(NEW.title); NEW.body := trim(NEW.body);
  IF length(NEW.title) < 3 OR length(NEW.title) > 120 THEN RAISE EXCEPTION 'Title must be 3–120 characters'; END IF;
  IF length(NEW.body) < 10 OR length(NEW.body) > 3000 THEN RAISE EXCEPTION 'Post must be 10–3000 characters'; END IF;
  IF NEW.link_url IS NOT NULL AND (NEW.link_url !~* '^https?://' OR length(NEW.link_url) > 500) THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF NEW.image_url IS NOT NULL AND (NEW.image_url !~* '^https://' OR length(NEW.image_url) > 500) THEN RAISE EXCEPTION 'Invalid image'; END IF;
  NEW.created_at := now();
  RETURN NEW;
END $function$;