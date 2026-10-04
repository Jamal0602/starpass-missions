ALTER TABLE public.profiles ADD COLUMN category text;
GRANT SELECT (category) ON public.profiles TO authenticated;