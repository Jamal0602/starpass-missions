import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, user_id, passport_id, full_name, callsign, avatar_url, bio, is_pro, skills, linkedin_url, github_url, instagram_url, created_at, category").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      return { userId: uid, profile, isAdmin: !!roles?.some((r) => r.role === "admin") };
    },
  });
}

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mission_schedules").select("*").order("mission_day");
      if (error) throw error;
      return data;
    },
  });
}

export function useMyStamps(profileId?: string) {
  return useQuery({
    queryKey: ["stamps", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collected_badges")
        .select("*")
        .eq("profile_id", profileId!);
      if (error) throw error;
      return data;
    },
  });
}
