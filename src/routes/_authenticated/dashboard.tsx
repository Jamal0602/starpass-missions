import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { KeyRound, Radio, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useMyStamps, useSchedule } from "@/hooks/use-me";
import { formatCountdown, hhmm, istToEpoch, stampState } from "@/lib/mission";
import { StampTile } from "@/components/StampTile";
import { AchievementDialog, playStamp } from "@/components/AchievementDialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import spaceBg from "@/assets/space-bg.jpg";
import astronaut from "@/assets/astronaut.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Flight Deck — AstraPass" },
      { name: "description", content: "Your daily mission window and 7-day Space Week passport ribbon." },
      { property: "og:title", content: "Flight Deck — AstraPass" },
      { property: "og:description", content: "Enter today's pass key and claim your mission badge." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: schedule = [] } = useSchedule();
  const { data: stamps = [] } = useMyStamps(me?.profile?.id);
  const [now, setNow] = useState(Date.now());
  const [pin, setPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [popup, setPopup] = useState<number | null>(null);

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
  const missed = tiles.filter((t) => t.state === "missed");
  const next = useMemo(
    () => schedule.find((s) => !s.is_force_closed && istToEpoch(s.active_date, s.start_time) > now),
    [schedule, now],
  );
  const current = active?.s ?? next;
  const popupMission = schedule.find((s) => s.mission_day === popup);

  async function claim(day: number) {
    if (!/^\d{4}$/.test(pin)) return void toast.error("Enter the 4-digit pass key");
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_badge_with_pin", { _day: day, _pin: pin });
    setClaiming(false);
    const r = (data ?? {}) as { ok?: boolean; error?: string };
    if (error || !r.ok) {
      setPin("");
      return void toast.error(r.error ?? "Could not verify pass key");
    }
    playStamp();
    setPin("");
    setPopup(day);
    qc.invalidateQueries({ queryKey: ["stamps"] });
    qc.invalidateQueries({ queryKey: ["scores"] });
  }

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border"
      >
        <img src={spaceBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
        <motion.img
          src={astronaut}
          alt=""
          className="pointer-events-none absolute -right-6 top-4 hidden w-56 md:block lg:w-72"
          animate={{ y: [0, -14, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative p-6 md:max-w-[60%] md:p-10">
          <div className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-primary">
            <Radio className="h-4 w-4" /> {active ? "LIVE WINDOW" : "COMMAND HEADER"}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Welcome, {me?.profile?.callsign || me?.profile?.full_name?.split(" ")[0] || "Explorer"}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight md:text-5xl">
            {current ? (
              <>
                Mission {String(current.mission_day).padStart(2, "0")}
                <br />
                <span className="text-primary">{current.title}</span>
              </>
            ) : (
              "All missions complete"
            )}
          </h1>
          {current && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {hhmm(current.start_time)}–{hhmm(current.end_time)} IST · {current.active_date}
            </p>
          )}
          {current && (
            <div className="mt-4">
              <div className="font-mono text-[11px] tracking-widest text-muted-foreground">{active ? "LOCKS IN" : "OPENS IN"}</div>
              <div className="font-mono text-3xl font-bold text-primary">
                {active?.s.is_force_open
                  ? "OVERRIDE"
                  : formatCountdown(istToEpoch(current.active_date, active ? current.end_time : current.start_time) - now)}
              </div>
            </div>
          )}

          {active && !stamped.has(active.s.mission_day) && (
            <form
              className="glass mt-6 rounded-2xl border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                claim(active.s.mission_day);
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-primary" /> Enter the pass key announced in class
              </div>
              <InputOTP maxLength={4} value={pin} onChange={(v) => setPin(v.replace(/\D/g, ""))} inputMode="numeric" pattern="^[0-9]*$">
                <InputOTPGroup>
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-14 w-14 font-mono text-2xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button type="submit" size="lg" className="mt-4 w-full shadow-neon" disabled={claiming || pin.length !== 4}>
                {claiming ? "Verifying…" : `Collect Mission ${active.s.mission_day} Badge`}
              </Button>
            </form>
          )}
        </div>
      </motion.section>

      {missed.length > 0 && (
        <section className="space-y-2">
          {missed.map(({ s }) => (
            <div key={s.mission_day} className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span className="line-through decoration-destructive decoration-2 opacity-80">
                Mission {String(s.mission_day).padStart(2, "0")} · {s.title}
              </span>
              <span className="ml-auto font-mono text-xs text-destructive">MISSED</span>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground">PASSPORT RIBBON</h2>
          <span className="font-mono text-sm text-primary">{stamped.size}/7 STAMPED</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map(({ s, state }) => (
            <div key={s.mission_day} className={state === "missed" ? "line-through opacity-60" : ""}>
              <StampTile day={s.mission_day} theme={s.theme} state={state} badgeUrl={s.badge_url} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Badges can only be claimed with the pass key during each mission's live window. Missed days cannot be claimed later.
        </p>
      </section>

      <AchievementDialog day={popup} title={popupMission?.title} badgeUrl={popupMission?.badge_url} onClose={() => setPopup(null)} />
    </div>
  );
}
