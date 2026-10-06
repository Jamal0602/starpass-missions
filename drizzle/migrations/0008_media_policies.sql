CREATE POLICY "Signed-in read media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','gif'));
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.validate_post()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.title := trim(NEW.title); NEW.body := trim(NEW.body);
  IF length(NEW.title) < 3 OR length(NEW.title) > 120 THEN RAISE EXCEPTION 'Title must be 3–120 characters'; END IF;
  IF length(NEW.body) < 10 OR length(NEW.body) > 3000 THEN RAISE EXCEPTION 'Post must be 10–3000 characters'; END IF;
  IF NEW.link_url IS NOT NULL AND (NEW.link_url !~* '^https?://' OR length(NEW.link_url) > 500) THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF NEW.image_url IS NOT NULL AND (NEW.image_url !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$' OR length(NEW.image_url) > 200) THEN RAISE EXCEPTION 'Invalid image'; END IF;
  NEW.created_at := now();
  RETURN NEW;
END $function$;

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
     (NEW.avatar_url IS NOT NULL AND NEW.avatar_url !~ '^(https://|[0-9a-f-]{36}/)') THEN
    RAISE EXCEPTION 'Invalid link';
  END IF;
  RETURN NEW;
END $function$;