import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useMyStamps, useSchedule } from "@/hooks/use-me";
import { formatCountdown, hhmm, istToEpoch, stampState } from "@/lib/mission";
import { StampTile } from "@/components/StampTile";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Flight Deck — AstraPass" },
      { name: "description", content: "Your daily mission window and 7-day Space Week passport ribbon." },
      { property: "og:title", content: "Flight Deck — AstraPass" },
      { property: "og:description", content: "Claim today's mission stamp." },
    ],
  }),
  component: Dashboard,
});

function playStamp() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    /* audio unavailable */
  }
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: schedule = [] } = useSchedule();
  const { data: stamps = [] } = useMyStamps(me?.profile?.id);
  const [now, setNow] = useState(Date.now());
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("schedule-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mission_schedules" }, () =>
        qc.invalidateQueries({ queryKey: ["schedule"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const stamped = new Set(stamps.map((s) => s.mission_day));
  const tiles = schedule.map((s) => ({ s, state: stampState(s, stamped.has(s.mission_day), now) }));
  const active = tiles.find((t) => t.state === "active");
  const next = useMemo(
    () => schedule.find((s) => !s.is_force_closed && istToEpoch(s.active_date, s.start_time) > now),
    [schedule, now],
  );
  const current = active?.s ?? next;

  async function claim(day: number) {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_badge", { _day: day });
    setClaiming(false);
    if (error) return void toast.error(error.message);
    playStamp();
    toast.success(`Day ${day} stamp collected!`);
    qc.invalidateQueries({ queryKey: ["stamps"] });
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border bg-navy-gradient p-5 md:p-8"
      >
        <div className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-primary">
          <Radio className="h-4 w-4" /> COMMAND HEADER
        </div>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {active ? "Current operational window" : current ? "Next operational window" : "Mission status"}
            </p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {current ? (
                <>
                  Day {String(current.mission_day).padStart(2, "0")}{" "}
                  <span className="text-primary">[{current.theme}]</span>
                </>
              ) : (
                "All missions complete"
              )}
            </h1>
            {current && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Window {hhmm(current.start_time)}–{hhmm(current.end_time)} IST · {current.active_date}
              </p>
            )}
          </div>
          {current && (
            <div className="text-left md:text-right">
              <div className="font-mono text-xs tracking-widest text-muted-foreground">
                {active ? "LOCKS IN" : "OPENS IN"}
              </div>
              <div className="font-mono text-2xl font-bold text-primary md:text-3xl">
                {active?.s.is_force_open
                  ? "OVERRIDE"
                  : formatCountdown(
                      istToEpoch(current.active_date, active ? current.end_time : current.start_time) - now,
                    )}
              </div>
            </div>
          )}
        </div>
        {active && (
          <Button size="lg" className="mt-6 w-full md:w-auto" disabled={claiming} onClick={() => claim(active.s.mission_day)}>
            {claiming ? "Stamping…" : `Claim Day ${active.s.mission_day} Badge`}
          </Button>
        )}
      </motion.section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground">PASSPORT RIBBON</h2>
          <span className="font-mono text-sm text-primary">{stamped.size}/7 STAMPED</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map(({ s, state }) => (
            <button
              key={s.mission_day}
              disabled={state !== "active" || claiming}
              onClick={() => claim(s.mission_day)}
              className="text-left disabled:cursor-default"
            >
              <StampTile day={s.mission_day} theme={s.theme} state={state} />
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Stamps can only be claimed during each day's live window. Past days cannot be claimed later.
        </p>
      </section>
    </div>
  );
}
