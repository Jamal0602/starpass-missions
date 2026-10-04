CREATE SEQUENCE IF NOT EXISTS public.passport_seq START 1001;

CREATE TYPE public.app_role AS ENUM ('admin', 'trainee');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  passport_id text UNIQUE NOT NULL DEFAULT ('SP-2026-' || nextval('public.passport_seq')::text),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone_number text UNIQUE NOT NULL,
  callsign text,
  avatar_url text,
  bio text,
  is_pro boolean NOT NULL DEFAULT false,
  skills text[] NOT NULL DEFAULT '{}',
  linkedin_url text,
  github_url text,
  instagram_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- contact columns (email, phone_number) are NOT readable by app users
GRANT SELECT (id, user_id, passport_id, full_name, callsign, avatar_url, bio, is_pro, skills, linkedin_url, github_url, instagram_url, created_at) ON public.profiles TO authenticated;
GRANT UPDATE (callsign, avatar_url, bio, is_pro, skills, linkedin_url, github_url, instagram_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-grant admin to the Flight Director when their account is linked
CREATE OR REPLACE FUNCTION public.grant_admin_if_director()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (
    lower(NEW.email) = 'ja.jamalasraf@gmail.com'
    OR right(regexp_replace(NEW.phone_number, '\D', '', 'g'), 10) = '6383844172'
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_admin_grant AFTER INSERT OR UPDATE OF user_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_if_director();

CREATE TABLE public.mission_schedules (
  mission_day int PRIMARY KEY CHECK (mission_day BETWEEN 1 AND 7),
  title text NOT NULL,
  theme text NOT NULL,
  active_date date NOT NULL,
  start_time time NOT NULL DEFAULT '17:00:00',
  end_time time NOT NULL DEFAULT '18:30:00',
  is_force_open boolean NOT NULL DEFAULT false,
  is_force_closed boolean NOT NULL DEFAULT false
);
GRANT SELECT, UPDATE ON public.mission_schedules TO authenticated;
GRANT ALL ON public.mission_schedules TO service_role;
ALTER TABLE public.mission_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view schedule" ON public.mission_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update schedule" ON public.mission_schedules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mission_schedules (mission_day, title, theme, active_date) VALUES
 (1, 'Mission 01', 'Launch Readiness', '2026-10-04'),
 (2, 'Mission 02', 'Orbital Mechanics', '2026-10-05'),
 (3, 'Mission 03', 'Propulsion Engine', '2026-10-06'),
 (4, 'Mission 04', 'Avionics & Telemetry', '2026-10-07'),
 (5, 'Mission 05', 'Satellite Systems', '2026-10-08'),
 (6, 'Mission 06', 'Deep Space Exploration', '2026-10-09'),
 (7, 'Mission 07', 'Return & Recovery', '2026-10-10');

CREATE TABLE public.collected_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_day int NOT NULL REFERENCES public.mission_schedules(mission_day),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  claim_speed_seconds int,
  granted_by_admin boolean NOT NULL DEFAULT false,
  UNIQUE (profile_id, mission_day)
);
GRANT SELECT ON public.collected_badges TO authenticated;
GRANT ALL ON public.collected_badges TO service_role;
ALTER TABLE public.collected_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view stamps" ON public.collected_badges FOR SELECT TO authenticated USING (true);

-- Atomic claim: only path for trainees to insert stamps
CREATE OR REPLACE FUNCTION public.claim_badge(_day int)
RETURNS public.collected_badges LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.mission_schedules;
  p_id uuid;
  ist timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  res public.collected_badges;
BEGIN
  SELECT id INTO p_id FROM public.profiles WHERE user_id = auth.uid();
  IF p_id IS NULL THEN RAISE EXCEPTION 'No passport linked to this account'; END IF;
  SELECT * INTO s FROM public.mission_schedules WHERE mission_day = _day;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown mission'; END IF;
  IF s.is_force_closed THEN RAISE EXCEPTION 'Mission window is closed'; END IF;
  IF NOT s.is_force_open AND NOT (ist::date = s.active_date AND ist::time BETWEEN s.start_time AND s.end_time) THEN
    RAISE EXCEPTION 'Mission window is not active';
  END IF;
  INSERT INTO public.collected_badges (profile_id, mission_day, claim_speed_seconds)
  VALUES (p_id, _day, GREATEST(0, EXTRACT(EPOCH FROM (ist::time - s.start_time))::int))
  RETURNING * INTO res;
  RETURN res;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Stamp already collected';
END $$;
REVOKE ALL ON FUNCTION public.claim_badge(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_badge(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_stamp(_passport_id text, _day int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT id INTO p_id FROM public.profiles WHERE upper(passport_id) = upper(trim(_passport_id));
  IF p_id IS NULL THEN RAISE EXCEPTION 'Passport not found'; END IF;
  INSERT INTO public.collected_badges (profile_id, mission_day, granted_by_admin)
  VALUES (p_id, _day, true) ON CONFLICT (profile_id, mission_day) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.admin_grant_stamp(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_stamp(text, int) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collected_badges;