import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchedule } from "@/hooks/use-me";
import { AchievementDialog, playStamp } from "@/components/AchievementDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/claim/$token")({
  head: () => ({
    meta: [
      { title: "Claim Badge — AstraPass" },
      { name: "description", content: "Collect your World Space Week mission badge." },
      { property: "og:title", content: "Claim Badge — AstraPass" },
      { property: "og:description", content: "Collect your World Space Week mission badge." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClaimPage,
});

function ClaimPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { data: schedule = [] } = useSchedule();
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; error?: string; day?: number }>({ status: "loading" });
  const [popup, setPopup] = useState<number | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("claim_badge_by_token", { _token: token.slice(0, 64) });
      const r = (data ?? {}) as { ok?: boolean; error?: string; day?: number };
      if (error || !r.ok) return setState({ status: "error", error: r.error ?? "Could not claim badge" });
      playStamp();
      setState({ status: "ok", day: r.day });
      setPopup(r.day ?? null);
      qc.invalidateQueries({ queryKey: ["stamps"] });
      qc.invalidateQueries({ queryKey: ["scores"] });
    })();
  }, [token, qc]);

  const s = schedule.find((x) => x.mission_day === (popup ?? state.day));

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {state.status === "loading" && (
        <p className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Verifying badge link…</p>
      )}
      {state.status === "error" && (
        <div className="rounded-2xl border bg-card p-8">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 font-semibold">{state.error}</p>
        </div>
      )}
      {state.status === "ok" && <p className="text-lg font-semibold">Badge added to your passport.</p>}
      <Button asChild variant="outline" className="mt-6"><Link to="/dashboard">Go to Flight Deck</Link></Button>
      <AchievementDialog day={popup} title={s?.title} badgeUrl={s?.badge_url} onClose={() => setPopup(null)} />
    </div>
  );
}
