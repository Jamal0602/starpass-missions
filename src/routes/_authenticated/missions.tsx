import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useSchedule } from "@/hooks/use-me";
import { istNowParts } from "@/lib/mission";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/missions")({
  head: () => ({
    meta: [
      { title: "Mission Operations — AstraPass" },
      { name: "description", content: "Complete each day's space mission log during World Space Week." },
      { property: "og:title", content: "Mission Operations — AstraPass" },
      { property: "og:description", content: "Complete each day's space mission log during World Space Week." },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: schedule = [] } = useSchedule();
  const pid = me?.profile?.id;
  const { data: subs = [] } = useQuery({
    queryKey: ["my-subs", pid],
    enabled: !!pid,
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_submissions").select("mission_day, response, created_at").eq("profile_id", pid!);
      if (error) throw error;
      return data;
    },
  });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const today = istNowParts().date;

  async function submit(day: number) {
    const text = (drafts[day] ?? "").trim();
    if (text.length < 10) return void toast.error("Write at least 10 characters");
    setBusy(day);
    const { error } = await supabase.rpc("submit_activity", { _day: day, _response: text.slice(0, 2000) });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success("Mission log transmitted");
    qc.invalidateQueries({ queryKey: ["my-subs"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
      <h1 className="font-mono text-xl font-bold tracking-widest text-primary">MISSION OPERATIONS</h1>
      <p className="text-sm text-muted-foreground">Each mission log opens only on its own day (IST). Share what you learned or built.</p>
      {schedule.map((s) => {
        const done = subs.find((x) => x.mission_day === s.mission_day);
        const open = s.is_force_open || s.active_date === today;
        return (
          <div key={s.mission_day} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {s.badge_url && <img src={s.badge_url} alt="" className="h-12 w-12" loading="lazy" />}
              <div className="flex-1">
                <div className="font-mono text-xs text-muted-foreground">MISSION 0{s.mission_day} · {s.active_date}</div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.theme}</div>
              </div>
              {done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : !open && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            {done ? (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary p-3 text-sm">{done.response}</p>
            ) : open ? (
              <div className="mt-3 space-y-2">
                <Textarea maxLength={2000} rows={4} placeholder="Your mission log…" value={drafts[s.mission_day] ?? ""} onChange={(e) => setDrafts({ ...drafts, [s.mission_day]: e.target.value })} />
                <Button onClick={() => submit(s.mission_day)} disabled={busy === s.mission_day}>{busy === s.mission_day ? "Transmitting…" : "Submit log"}</Button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{s.active_date < today ? "Window closed." : "Opens on mission day."}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
