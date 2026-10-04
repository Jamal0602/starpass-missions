import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useSchedule } from "@/hooks/use-me";
import { adminListParticipants } from "@/lib/passport.functions";
import { stampState, type Schedule } from "@/lib/mission";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AdminKeysPanel, AdminChallengePanel } from "@/components/AdminKeysPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Flight Director Console — AstraPass" },
      { name: "description", content: "Admin controls for mission windows and passport stamps." },
      { property: "og:title", content: "Flight Director Console — AstraPass" },
      { property: "og:description", content: "Admin controls for AstraPass." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  if (!me?.isAdmin)
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 text-xl font-bold">Restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">Flight Director clearance required.</p>
      </div>
    );
  return <Console />;
}

function Console() {
  const qc = useQueryClient();
  const { data: schedule = [] } = useSchedule();
  const list = useServerFn(adminListParticipants);
  const { data: people = [] } = useQuery({ queryKey: ["admin-participants"], queryFn: () => list() });
  const [pid, setPid] = useState("");
  const [day, setDay] = useState("1");

  async function update(d: number, patch: Partial<Schedule>) {
    const { error } = await supabase.from("mission_schedules").update(patch).eq("mission_day", d);
    if (error) return void toast.error("Update failed");
    qc.invalidateQueries({ queryKey: ["schedule"] });
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.rpc("admin_grant_stamp", { _passport_id: pid, _day: Number(day) });
    if (error) return void toast.error(error.message);
    toast.success(`Stamp granted to ${pid.toUpperCase()}`);
    setPid("");
    qc.invalidateQueries({ queryKey: ["admin-participants"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldCheck className="h-6 w-6 text-primary" /> Flight Director Console
      </h1>

      <section className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-3 font-mono text-xs tracking-widest text-muted-foreground">MISSION WINDOWS (IST)</div>
        <div className="divide-y">
          {schedule.map((s) => (
            <div key={s.mission_day} className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_auto_auto_auto_auto] md:items-center">
              <div>
                <div className="font-mono text-sm text-primary">DAY {s.mission_day} · {s.active_date}</div>
                <div className="text-sm">{s.theme}</div>
                <div className="font-mono text-[11px] uppercase text-muted-foreground">{stampState(s, false)}</div>
              </div>
              <Input type="time" defaultValue={s.start_time.slice(0, 5)} className="w-32 font-mono"
                onBlur={(e) => e.target.value && update(s.mission_day, { start_time: e.target.value })} />
              <Input type="time" defaultValue={s.end_time.slice(0, 5)} className="w-32 font-mono"
                onBlur={(e) => e.target.value && update(s.mission_day, { end_time: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={s.is_force_open}
                  onCheckedChange={(v) => update(s.mission_day, { is_force_open: v, is_force_closed: v ? false : s.is_force_closed })} />
                Force open
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={s.is_force_closed}
                  onCheckedChange={(v) => update(s.mission_day, { is_force_closed: v, is_force_open: v ? false : s.is_force_open })} />
                Force close
              </label>
            </div>
          ))}
        </div>
      </section>

      <AdminKeysPanel />
      <AdminChallengePanel />
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Direct Stamp Injector</h2>
        <form onSubmit={grant} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Passport ID</Label>
            <Input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="SW26-SE-0001" className="font-mono uppercase" required />
          </div>
          <div className="space-y-1">
            <Label>Day</Label>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>Day {d}</option>)}
            </select>
          </div>
          <Button type="submit">Grant stamp</Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-3 font-mono text-xs tracking-widest text-muted-foreground">
          PARTICIPANTS · {people.length}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="px-5 py-2">Passport</th><th className="px-2">Name</th><th className="px-2">Contact</th><th className="px-2">Status</th><th className="px-2">Stamps</th></tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-2 font-mono text-primary">{p.passport_id}</td>
                  <td className="px-2">{p.full_name}</td>
                  <td className="px-2 text-xs text-muted-foreground">{p.email}<br />{p.phone_number}</td>
                  <td className="px-2 text-xs">{p.user_id ? "Active" : "Awaiting activation"}{p.is_pro ? " · Pioneer" : ""}</td>
                  <td className="px-2 font-mono">{p.collected_badges?.length ?? 0}/7</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
