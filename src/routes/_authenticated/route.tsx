import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { LaunchLoader } from "@/components/LaunchLoader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Local session check keeps page changes instant; every data read is still verified by the backend.
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      try {
        sessionStorage.setItem("astra-next", location.href);
      } catch {
        /* storage unavailable */
      }
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  pendingComponent: () => <LaunchLoader label="Verifying clearance…" />,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
