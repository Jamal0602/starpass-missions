import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AstraPass — Space Week Passport" },
      { name: "description", content: "Collect daily mission stamps during World Space Week with your AstraPass digital space passport." },
      { property: "og:title", content: "AstraPass — Space Week Passport" },
      { property: "og:description", content: "Collect daily mission stamps during World Space Week." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/login" });
  },
});
