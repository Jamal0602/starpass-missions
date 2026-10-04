-- Hide private contact columns from other users; restrict editable columns
REVOKE SELECT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, user_id, passport_id, full_name, callsign, avatar_url, bio, is_pro, skills, linkedin_url, github_url, instagram_url, created_at, category) ON public.profiles TO authenticated;
GRANT UPDATE (callsign, avatar_url, bio, is_pro, skills, linkedin_url, github_url, instagram_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_pro AND coalesce(array_length(NEW.skills, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Pioneer status requires at least 2 skills';
  END IF;
  IF length(coalesce(NEW.bio,'')) > 500 OR length(coalesce(NEW.callsign,'')) > 40 THEN
    RAISE EXCEPTION 'Field too long';
  END IF;
  IF coalesce(array_length(NEW.skills,1),0) > 15 THEN RAISE EXCEPTION 'Too many skills'; END IF;
  IF (NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url !~* '^https?://') OR
     (NEW.github_url IS NOT NULL AND NEW.github_url !~* '^https?://') OR
     (NEW.instagram_url IS NOT NULL AND NEW.instagram_url !~* '^https?://') THEN
    RAISE EXCEPTION 'Links must start with http:// or https://';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_validate ON public.profiles;
CREATE TRIGGER profiles_validate BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_update();

-- Activity submissions (one per mission day, only for unlocked days)
CREATE TABLE public.activity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_day integer NOT NULL REFERENCES public.mission_schedules(mission_day),
  response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, mission_day)
);
GRANT SELECT ON public.activity_submissions TO authenticated;
GRANT ALL ON public.activity_submissions TO service_role;
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view submissions" ON public.activity_submissions FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.submit_activity(_day integer, _response text)
RETURNS public.activity_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_id uuid; s public.mission_schedules; ist date := (now() AT TIME ZONE 'Asia/Kolkata')::date; res public.activity_submissions;
BEGIN
  SELECT id INTO p_id FROM public.profiles WHERE user_id = auth.uid();
  IF p_id IS NULL THEN RAISE EXCEPTION 'No passport linked to this account'; END IF;
  _response := trim(_response);
  IF length(_response) < 10 OR length(_response) > 2000 THEN RAISE EXCEPTION 'Response must be 10–2000 characters'; END IF;
  SELECT * INTO s FROM public.mission_schedules WHERE mission_day = _day;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown mission'; END IF;
  IF NOT s.is_force_open AND ist <> s.active_date THEN RAISE EXCEPTION 'This mission is only open on its own day'; END IF;
  INSERT INTO public.activity_submissions (profile_id, mission_day, response) VALUES (p_id, _day, _response) RETURNING * INTO res;
  RETURN res;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You already submitted this mission';
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_activity(integer, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_activity(integer, text) TO authenticated;

-- Pioneer feed
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pioneers publish own posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid() AND p.is_pro));
CREATE POLICY "Authors or admins delete posts" ON public.posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_post()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.title := trim(NEW.title); NEW.body := trim(NEW.body);
  IF length(NEW.title) < 3 OR length(NEW.title) > 120 THEN RAISE EXCEPTION 'Title must be 3–120 characters'; END IF;
  IF length(NEW.body) < 10 OR length(NEW.body) > 3000 THEN RAISE EXCEPTION 'Post must be 10–3000 characters'; END IF;
  IF NEW.link_url IS NOT NULL AND (NEW.link_url !~* '^https?://' OR length(NEW.link_url) > 500) THEN RAISE EXCEPTION 'Invalid link'; END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER posts_validate BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_post();

-- Lock down RPC execution to signed-in users
REVOKE EXECUTE ON FUNCTION public.claim_badge(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_badge(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_grant_stamp(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_grant_stamp(text, integer) TO authenticated;