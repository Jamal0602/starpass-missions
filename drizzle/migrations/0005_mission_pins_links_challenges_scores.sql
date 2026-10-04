-- Mission secrets (PIN + claim link), admin only
CREATE TABLE public.mission_secrets (
  mission_day integer PRIMARY KEY REFERENCES public.mission_schedules(mission_day) ON DELETE CASCADE,
  pin text CHECK (pin IS NULL OR pin ~ '^[0-9]{4}$'),
  claim_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  link_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mission_secrets TO authenticated;
GRANT ALL ON public.mission_secrets TO service_role;
ALTER TABLE public.mission_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage secrets" ON public.mission_secrets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.mission_secrets (mission_day) SELECT mission_day FROM public.mission_schedules ON CONFLICT DO NOTHING;

-- Failed PIN attempts (brute-force lock)
CREATE TABLE public.pin_attempts (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_day integer NOT NULL,
  failures integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, mission_day)
);
GRANT ALL ON public.pin_attempts TO service_role;
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

-- Old claim (no PIN) is no longer callable by users
REVOKE EXECUTE ON FUNCTION public.claim_badge(integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._window_open(s public.mission_schedules)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT NOT s.is_force_closed AND (s.is_force_open OR (
    (now() AT TIME ZONE 'Asia/Kolkata')::date = s.active_date AND
    (now() AT TIME ZONE 'Asia/Kolkata')::time BETWEEN s.start_time AND s.end_time))
$$;

CREATE OR REPLACE FUNCTION public.claim_badge_with_pin(_day integer, _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_id uuid; s public.mission_schedules; sec public.mission_secrets; fails int;
  ist time := (now() AT TIME ZONE 'Asia/Kolkata')::time;
BEGIN
  SELECT id INTO p_id FROM public.profiles WHERE user_id = auth.uid();
  IF p_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','No passport linked to this account'); END IF;
  SELECT * INTO s FROM public.mission_schedules WHERE mission_day = _day;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Unknown mission'); END IF;
  IF EXISTS (SELECT 1 FROM public.collected_badges WHERE profile_id=p_id AND mission_day=_day) THEN
    RETURN jsonb_build_object('ok',false,'error','Badge already collected'); END IF;
  IF NOT public._window_open(s) THEN RETURN jsonb_build_object('ok',false,'error','Mission window is not active'); END IF;
  SELECT * INTO sec FROM public.mission_secrets WHERE mission_day = _day;
  IF sec.pin IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Pass key not announced yet'); END IF;
  SELECT failures INTO fails FROM public.pin_attempts WHERE profile_id=p_id AND mission_day=_day;
  IF coalesce(fails,0) >= 5 THEN RETURN jsonb_build_object('ok',false,'error','Too many wrong keys. Ask Flight Control for help.'); END IF;
  IF coalesce(_pin,'') <> sec.pin THEN
    INSERT INTO public.pin_attempts (profile_id, mission_day, failures) VALUES (p_id,_day,1)
      ON CONFLICT (profile_id, mission_day) DO UPDATE SET failures = public.pin_attempts.failures + 1;
    RETURN jsonb_build_object('ok',false,'error','Wrong pass key ('||(4-coalesce(fails,0))||' tries left)');
  END IF;
  INSERT INTO public.collected_badges (profile_id, mission_day, claim_speed_seconds)
  VALUES (p_id,_day, GREATEST(0, EXTRACT(EPOCH FROM (ist - s.start_time))::int)) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok',true,'day',_day);
END $$;

CREATE OR REPLACE FUNCTION public.claim_badge_by_token(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_id uuid; s public.mission_schedules; sec public.mission_secrets;
  ist time := (now() AT TIME ZONE 'Asia/Kolkata')::time;
BEGIN
  IF _token IS NULL OR length(_token) <> 64 THEN RETURN jsonb_build_object('ok',false,'error','Invalid link'); END IF;
  SELECT id INTO p_id FROM public.profiles WHERE user_id = auth.uid();
  IF p_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','No passport linked to this account'); END IF;
  SELECT * INTO sec FROM public.mission_secrets WHERE claim_token = _token;
  IF NOT FOUND OR NOT sec.link_enabled THEN RETURN jsonb_build_object('ok',false,'error','This badge link is not active'); END IF;
  SELECT * INTO s FROM public.mission_schedules WHERE mission_day = sec.mission_day;
  IF EXISTS (SELECT 1 FROM public.collected_badges WHERE profile_id=p_id AND mission_day=s.mission_day) THEN
    RETURN jsonb_build_object('ok',false,'error','Badge already collected','day',s.mission_day); END IF;
  IF NOT public._window_open(s) THEN RETURN jsonb_build_object('ok',false,'error','Mission window is not active','day',s.mission_day); END IF;
  INSERT INTO public.collected_badges (profile_id, mission_day, claim_speed_seconds)
  VALUES (p_id, s.mission_day, GREATEST(0, EXTRACT(EPOCH FROM (ist - s.start_time))::int)) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok',true,'day',s.mission_day);
END $$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_token(_day integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.mission_secrets SET claim_token = replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), updated_at = now() WHERE mission_day=_day;
END $$;

-- Challenges (quiz arena)
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  question text NOT NULL CHECK (length(question) BETWEEN 5 AND 1000),
  options text[] NOT NULL CHECK (array_length(options,1) BETWEEN 2 AND 6),
  category text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  points integer NOT NULL DEFAULT 10 CHECK (points BETWEEN 1 AND 500),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read active challenges" ON public.challenges FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update challenges" ON public.challenges FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete challenges" ON public.challenges FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.challenge_keys (
  challenge_id uuid PRIMARY KEY REFERENCES public.challenges(id) ON DELETE CASCADE,
  correct_index integer NOT NULL CHECK (correct_index >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_keys TO authenticated;
GRANT ALL ON public.challenge_keys TO service_role;
ALTER TABLE public.challenge_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage keys" ON public.challenge_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  selected_index integer NOT NULL,
  is_correct boolean NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, challenge_id)
);
GRANT SELECT ON public.challenge_attempts TO authenticated;
GRANT ALL ON public.challenge_attempts TO service_role;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin attempts" ON public.challenge_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.submit_challenge(_id uuid, _choice integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_id uuid; c public.challenges; k int; ok boolean;
BEGIN
  SELECT id INTO p_id FROM public.profiles WHERE user_id = auth.uid();
  IF p_id IS NULL THEN RAISE EXCEPTION 'No passport linked to this account'; END IF;
  SELECT * INTO c FROM public.challenges WHERE id=_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not available'; END IF;
  IF _choice < 0 OR _choice >= array_length(c.options,1) THEN RAISE EXCEPTION 'Invalid option'; END IF;
  SELECT correct_index INTO k FROM public.challenge_keys WHERE challenge_id=_id;
  ok := (k = _choice);
  INSERT INTO public.challenge_attempts (profile_id, challenge_id, selected_index, is_correct, points_awarded)
  VALUES (p_id,_id,_choice,ok, CASE WHEN ok THEN c.points ELSE 0 END);
  RETURN jsonb_build_object('correct',ok,'correct_index',k,'points',CASE WHEN ok THEN c.points ELSE 0 END);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You already attempted this challenge';
END $$;

CREATE OR REPLACE FUNCTION public.profile_scores()
RETURNS TABLE(profile_id uuid, stamps int, missions int, solved int, challenge_points int, score int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    (SELECT count(*)::int FROM public.collected_badges b WHERE b.profile_id=p.id),
    (SELECT count(*)::int FROM public.activity_submissions a WHERE a.profile_id=p.id),
    (SELECT count(*)::int FROM public.challenge_attempts c WHERE c.profile_id=p.id AND c.is_correct),
    (SELECT coalesce(sum(points_awarded),0)::int FROM public.challenge_attempts c WHERE c.profile_id=p.id),
    ((SELECT count(*) FROM public.collected_badges b WHERE b.profile_id=p.id)*100
     + (SELECT count(*) FROM public.activity_submissions a WHERE a.profile_id=p.id)*50
     + (SELECT coalesce(sum(points_awarded),0) FROM public.challenge_attempts c WHERE c.profile_id=p.id)
     + least(coalesce(array_length(p.skills,1),0),10)*10 + CASE WHEN p.is_pro THEN 25 ELSE 0 END)::int
  FROM public.profiles p WHERE auth.uid() IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION public.claim_badge_with_pin(integer,text), public.claim_badge_by_token(text), public.submit_challenge(uuid,integer), public.profile_scores(), public.admin_regenerate_token(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_badge_with_pin(integer,text), public.claim_badge_by_token(text), public.submit_challenge(uuid,integer), public.profile_scores(), public.admin_regenerate_token(integer) TO authenticated;

-- Starter quiz set
WITH q(title, question, options, category, difficulty, points, ans) AS (VALUES
 ('First Satellite','Which was the first artificial satellite launched into orbit?',ARRAY['Explorer 1','Sputnik 1','Vanguard 1','Aryabhata'],'Satellites','easy',10,1),
 ('India''s First Satellite','What was India''s first satellite, launched in 1975?',ARRAY['Rohini','Bhaskara','Aryabhata','INSAT-1A'],'ISRO','easy',10,2),
 ('Red Planet Mission','Which ISRO mission made India the first nation to reach Mars orbit on its first attempt?',ARRAY['Chandrayaan-1','Mangalyaan','Aditya-L1','Gaganyaan'],'ISRO','medium',20,1),
 ('Escape Velocity','Approximate escape velocity from Earth''s surface?',ARRAY['7.9 km/s','11.2 km/s','16.7 km/s','3.0 km/s'],'Rocketry','medium',20,1),
 ('First Human in Space','Who was the first human to travel into space?',ARRAY['Neil Armstrong','Yuri Gagarin','Alan Shepard','Valentina Tereshkova'],'Human Spaceflight','easy',10,1),
 ('Lagrange Point','Aditya-L1 observes the Sun from which Lagrange point?',ARRAY['L1','L2','L3','L5'],'ISRO','medium',20,0),
 ('Rocket Equation','The Tsiolkovsky rocket equation relates delta-v to exhaust velocity and…',ARRAY['Thrust-to-weight ratio','Mass ratio','Burn time','Air density'],'Rocketry','hard',40,1),
 ('Largest Planet','Which is the largest planet in our solar system?',ARRAY['Saturn','Neptune','Jupiter','Uranus'],'Astronomy','easy',10,2),
 ('Light from the Sun','About how long does sunlight take to reach Earth?',ARRAY['8 seconds','8 minutes','8 hours','80 minutes'],'Astronomy','medium',20,1),
 ('Event Horizon','The boundary around a black hole beyond which nothing escapes is called the…',ARRAY['Photon sphere','Accretion disk','Event horizon','Singularity'],'Astrophysics','hard',40,2)
), ins AS (
  INSERT INTO public.challenges (title, question, options, category, difficulty, points)
  SELECT title, question, options, category, difficulty, points FROM q RETURNING id, title
)
INSERT INTO public.challenge_keys (challenge_id, correct_index)
SELECT ins.id, q.ans FROM ins JOIN q USING (title);