import { createFileRoute, Link } from "@tanstack/react-router";
import { uploadImage } from "@/lib/media";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { BadgeCheck, Camera, Copy, Newspaper, Settings, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useMyStamps, useSchedule } from "@/hooks/use-me";
import { stampState } from "@/lib/mission";
import { SpaceAvatar } from "@/components/SpaceAvatar";
import { StampTile } from "@/components/StampTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Digital Space Passport — AstraPass" },
      { name: "description", content: "Your AstraPass identity card, stamp matrix and Pioneer profile." },
      { property: "og:title", content: "Digital Space Passport — AstraPass" },
      { property: "og:description", content: "Your AstraPass identity card and stamps." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: schedule = [] } = useSchedule();
  const p = me?.profile;
  const { data: stamps = [] } = useMyStamps(p?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ callsign: "", bio: "", skills: "", linkedin_url: "", github_url: "", instagram_url: "", interests: "", languages: "", location: "", education: "", goals: "", availability: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (p)
      setForm({
        callsign: p.callsign ?? "",
        bio: p.bio ?? "",
        skills: p.skills.join(", "),
        linkedin_url: p.linkedin_url ?? "",
        github_url: p.github_url ?? "",
        instagram_url: p.instagram_url ?? "",
        interests: (p.interests ?? []).join(", "),
        languages: (p.languages ?? []).join(", "),
        location: p.location ?? "",
        education: p.education ?? "",
        goals: p.goals ?? "",
        availability: p.availability ?? "",
      });
  }, [p]);

  if (!p) return <div className="text-muted-foreground">Loading passport…</div>;

  const shareUrl = `https://starpass-missions.lovable.app/p/${p.passport_id}`;
  const stamped = new Set(stamps.map((s) => s.mission_day));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15);
    if (skills.length < 2) return void toast.error("Add at least 2 skills");
    const list = (v: string, n: number) => v.split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, n);
    const txt = (v: string, n: number) => v.trim().slice(0, n) || null;
    const url = (v: string) => (v.trim() ? v.trim().slice(0, 255) : null);
    const { error } = await supabase
      .from("profiles")
      .update({
        callsign: form.callsign.trim().slice(0, 40) || null,
        bio: form.bio.trim().slice(0, 500) || null,
        skills,
        linkedin_url: url(form.linkedin_url),
        github_url: url(form.github_url),
        instagram_url: url(form.instagram_url),
        interests: list(form.interests, 15),
        languages: list(form.languages, 10),
        location: txt(form.location, 80),
        education: txt(form.education, 120),
        goals: txt(form.goals, 300),
        availability: txt(form.availability, 80),
        is_pro: true,
      })
      .eq("id", p!.id);
    if (error) return void toast.error("Could not save profile");
    toast.success("Pioneer profile activated");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const path = await uploadImage(f);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", p!.id);
      if (error) throw new Error("Could not save photo");
      toast.success("Profile photo updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <motion.div
        initial={{ opacity: 0, rotateX: 10 }}
        animate={{ opacity: 1, rotateX: 0 }}
        className="overflow-hidden rounded-2xl border bg-card"
      >
        <div className="flex items-center justify-between bg-navy-gradient px-5 py-3 font-mono text-xs tracking-[0.25em] text-primary">
          <span>SPACE PASSPORT · WSW 2026</span>
          {p.is_pro && (
            <span className="flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" /> PIONEER
            </span>
          )}
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <label className="group relative h-24 w-24 shrink-0 cursor-pointer" aria-label="Change profile photo">
            <SpaceAvatar passportId={p.passport_id} url={p.avatar_url} className="h-24 w-24" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-primary" />
            </span>
            {uploading && <span className="absolute inset-0 animate-pulse rounded-full bg-primary/30" />}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={onAvatar} disabled={uploading} />
          </label>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Callsign</div>
              <div className="font-mono text-lg">{p.callsign ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Name</div>
              <div className="text-lg font-semibold">{p.full_name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Passport ID</div>
              <div className="font-mono text-xl font-bold text-primary">{p.passport_id}</div>
            </div>
            <ProfileScore profileId={p.id} />
            {(p.location || p.education) && (
              <div className="text-xs text-muted-foreground">{[p.location, p.education].filter(Boolean).join(" · ")}</div>
            )}
            {p.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {p.skills.map((s) => (
                  <span key={s} className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[11px] text-primary">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 self-start rounded-lg bg-foreground p-2">
            <QRCodeSVG value={shareUrl} size={96} bgColor="transparent" />
          </div>
        </div>
        <div className="border-t p-5">
          <div className="mb-3 font-mono text-xs tracking-widest text-muted-foreground">STAMP MATRIX</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {schedule.map((s) => (
              <StampTile key={s.mission_day} compact day={s.mission_day} theme={s.theme} state={stampState(s, stamped.has(s.mission_day))} badgeUrl={s.badge_url} />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/feed" className="flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm hover:border-primary"><Newspaper className="h-4 w-4 text-primary" /> Showcase</Link>
          <Link to="/settings" className="flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm hover:border-primary"><Settings className="h-4 w-4 text-primary" /> Settings</Link>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Share passport</h2>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={shareUrl} className="font-mono text-xs" />
            <Button
              variant="secondary"
              size="icon"
              aria-label="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-card p-5">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="mt-2 font-semibold">{p.is_pro ? "Pioneer Profile" : "Upgrade to Pioneer Profile"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your skills and social links to unlock publishing on the Pioneer Showcase.
          </p>
          <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
            {p.is_pro ? "Edit Pioneer details" : "Upgrade now"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pioneer Profile</DialogTitle>
            <DialogDescription>At least 2 skills are required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Callsign</Label>
              <Input value={form.callsign} onChange={set("callsign")} maxLength={40} />
            </div>
            <div className="space-y-1">
              <Label>Skills (comma separated)</Label>
              <Input value={form.skills} onChange={set("skills")} placeholder="Avionics, React, SolidPropulsion" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Interests</Label><Input value={form.interests} onChange={set("interests")} placeholder="Astronomy, Robotics" /></div>
              <div className="space-y-1"><Label>Languages</Label><Input value={form.languages} onChange={set("languages")} placeholder="Tamil, English" /></div>
              <div className="space-y-1"><Label>Native place / location</Label><Input value={form.location} onChange={set("location")} maxLength={80} /></div>
              <div className="space-y-1"><Label>Education</Label><Input value={form.education} onChange={set("education")} maxLength={120} placeholder="B.E. Aerospace, 2nd year" /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Space goals</Label><Input value={form.goals} onChange={set("goals")} maxLength={300} placeholder="Build a CubeSat…" /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Availability</Label><Input value={form.availability} onChange={set("availability")} maxLength={80} placeholder="Weekends, evenings" /></div>
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={set("bio")} maxLength={500} />
            </div>
            <div className="space-y-1">
              <Label>LinkedIn (optional)</Label>
              <Input value={form.linkedin_url} onChange={set("linkedin_url")} />
            </div>
            <div className="space-y-1">
              <Label>GitHub (optional)</Label>
              <Input value={form.github_url} onChange={set("github_url")} />
            </div>
            <div className="space-y-1">
              <Label>Instagram (optional)</Label>
              <Input value={form.instagram_url} onChange={set("instagram_url")} />
            </div>
            <Button type="submit" className="w-full">
              Save Pioneer Profile
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileScore({ profileId }: { profileId: string }) {
  const { data } = useQuery({
    queryKey: ["scores", "mine", profileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("profile_scores");
      if (error) throw error;
      return data.find((r) => r.profile_id === profileId) ?? null;
    },
  });
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Profile score</div>
      <div className="font-mono text-2xl font-bold text-primary">{data?.score ?? 0}</div>
      <div className="font-mono text-[11px] text-muted-foreground">
        {data?.stamps ?? 0} badges · {data?.missions ?? 0} logs · {data?.solved ?? 0} solved
      </div>
    </div>
  );
}
