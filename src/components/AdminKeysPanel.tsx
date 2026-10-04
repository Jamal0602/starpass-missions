import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function AdminKeysPanel() {
  const qc = useQueryClient();
  const { data: secrets = [] } = useQuery({
    queryKey: ["admin-secrets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mission_secrets").select("*").order("mission_day");
      if (error) throw error;
      return data;
    },
  });
  const [qr, setQr] = useState<number | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-secrets"] });

  async function patch(day: number, p: { pin?: string | null; link_enabled?: boolean }) {
    const { error } = await supabase.from("mission_secrets").update({ ...p, updated_at: new Date().toISOString() }).eq("mission_day", day);
    if (error) return void toast.error("Update failed");
    toast.success("Saved");
    refresh();
  }
  async function regen(day: number) {
    const { error } = await supabase.rpc("admin_regenerate_token", { _day: day });
    if (error) return void toast.error(error.message);
    toast.success("New link created — old link no longer works");
    refresh();
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b px-5 py-3 font-mono text-xs tracking-widest text-muted-foreground">PASS KEYS & BADGE LINKS</div>
      <div className="divide-y">
        {secrets.map((s) => {
          const link = `${origin}/claim/${s.claim_token}`;
          return (
            <div key={s.mission_day} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-16 font-mono text-sm text-primary">DAY {s.mission_day}</span>
                <form className="flex items-center gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  const v = String(new FormData(e.currentTarget).get("pin") ?? "").trim();
                  if (v && !/^\d{4}$/.test(v)) return void toast.error("Pass key must be 4 digits");
                  patch(s.mission_day, { pin: v || null });
                }}>
                  <Input name="pin" defaultValue={s.pin ?? ""} placeholder="4-digit key" inputMode="numeric" maxLength={4} className="w-28 font-mono tracking-widest" />
                  <Button size="sm" type="submit">Save key</Button>
                </form>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={s.link_enabled} onCheckedChange={(v) => patch(s.mission_day, { link_enabled: v })} /> Badge link
                </label>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-3 w-3" /> Copy</Button>
                <Button size="sm" variant="outline" onClick={() => setQr(qr === s.mission_day ? null : s.mission_day)}>QR</Button>
                <Button size="sm" variant="ghost" onClick={() => regen(s.mission_day)}><RefreshCw className="h-3 w-3" /> New link</Button>
              </div>
              {qr === s.mission_day && (
                <div className="flex flex-col items-start gap-2">
                  <div className="rounded-lg bg-foreground p-3"><QRCodeSVG value={link} size={200} bgColor="transparent" /></div>
                  {!s.link_enabled && <p className="text-xs text-destructive">Link is off — switch it on before showing the QR.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="px-5 pb-4 text-xs text-muted-foreground">Keys and links only work during each mission's live window.</p>
    </section>
  );
}

export function AdminChallengePanel() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", question: "", options: "", correct: "1", category: "General", difficulty: "easy", points: "10" });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const options = f.options.split("\n").map((o) => o.trim()).filter(Boolean).slice(0, 6);
    const idx = Number(f.correct) - 1;
    if (f.title.trim().length < 3 || f.question.trim().length < 5) return void toast.error("Add a title and question");
    if (options.length < 2) return void toast.error("Add at least 2 options (one per line)");
    if (!(idx >= 0 && idx < options.length)) return void toast.error("Correct option number is out of range");
    const points = Math.min(500, Math.max(1, Number(f.points) || 10));
    setBusy(true);
    const { data, error } = await supabase.from("challenges").insert({
      title: f.title.trim().slice(0, 120), question: f.question.trim().slice(0, 2000), options: options.map((o) => o.slice(0, 200)),
      category: f.category.trim().slice(0, 40) || "General", difficulty: f.difficulty, points,
    }).select("id").single();
    if (error || !data) { setBusy(false); return void toast.error("Could not add challenge"); }
    const k = await supabase.from("challenge_keys").insert({ challenge_id: data.id, correct_index: idx });
    setBusy(false);
    if (k.error) return void toast.error("Saved question but not the answer key");
    toast.success("Challenge published");
    setF({ ...f, title: "", question: "", options: "" });
    qc.invalidateQueries({ queryKey: ["challenges"] });
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Add Arena challenge</h2>
      <form onSubmit={add} className="mt-3 grid gap-3 md:grid-cols-2">
        <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
        <Input placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} maxLength={40} />
        <Textarea className="md:col-span-2" placeholder="Question" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} maxLength={2000} />
        <Textarea className="md:col-span-2" rows={4} placeholder={"Options, one per line"} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} />
        <div className="flex gap-2 md:col-span-2">
          <Input type="number" min={1} max={6} value={f.correct} onChange={(e) => setF({ ...f, correct: e.target.value })} className="w-28" aria-label="Correct option number" />
          <select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
          <Input type="number" min={1} max={500} value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} className="w-24" aria-label="Points" />
          <Button type="submit" disabled={busy}>Publish</Button>
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">First box = number of the correct option (1 = first line).</p>
      </form>
    </section>
  );
}
