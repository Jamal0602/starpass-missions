import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, useMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type Poster = {
  id: string; title: string; subtitle: string | null; image_url: string; link_url: string | null;
  mission_day: number | null; sort_order: number; is_active: boolean;
};

export function usePosters() {
  return useQuery({
    queryKey: ["posters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_posters").select("*").order("sort_order");
      if (error) throw error;
      return data as Poster[];
    },
  });
}

const safe = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

function PosterCard({ p }: { p: Poster }) {
  const src = useMediaUrl(p.image_url);
  const url = safe(p.link_url);
  return (
    <article className="w-72 shrink-0 snap-start overflow-hidden rounded-2xl border bg-card md:w-auto">
      <div className="aspect-[4/5] overflow-hidden bg-muted">
        {src && <img src={src} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />}
      </div>
      <div className="space-y-2 p-4">
        {p.mission_day && <div className="font-mono text-[11px] tracking-widest text-primary">DAY {String(p.mission_day).padStart(2, "0")}</div>}
        <h3 className="font-semibold leading-tight">{p.title}</h3>
        {p.subtitle && <p className="text-xs text-muted-foreground">{p.subtitle}</p>}
        {url && (
          <Button asChild size="sm" className="w-full shadow-neon">
            <a href={url} target="_blank" rel="noopener noreferrer">Visit activity <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
          </Button>
        )}
      </div>
    </article>
  );
}

export function ActivityPosters() {
  const { data = [] } = usePosters();
  const list = data.filter((p) => p.is_active);
  if (!list.length) return null;
  return (
    <section>
      <h2 className="mb-3 font-mono text-sm tracking-widest text-muted-foreground">ACTIVITY POSTERS</h2>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
        {list.map((p) => <PosterCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export function AdminPostersPanel() {
  const qc = useQueryClient();
  const { data = [] } = usePosters();
  const [f, setF] = useState({ title: "", subtitle: "", link: "", day: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["posters"] });

  async function patch(id: string, v: Partial<Poster>) {
    if (v.link_url !== undefined && v.link_url && !safe(v.link_url)) return void toast.error("Link must start with https://");
    const { error } = await supabase.from("activity_posters").update(v).eq("id", id);
    if (error) return void toast.error("Update failed");
    refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this poster?")) return;
    await supabase.from("activity_posters").delete().eq("id", id);
    refresh();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return void toast.error("Choose a poster image");
    if (f.link && !safe(f.link)) return void toast.error("Link must start with https://");
    setBusy(true);
    try {
      const path = await uploadImage(file);
      const { error } = await supabase.from("activity_posters").insert({
        title: f.title.trim().slice(0, 120), subtitle: f.subtitle.trim().slice(0, 200) || null,
        image_url: path, link_url: f.link.trim() || null, mission_day: f.day ? Number(f.day) : null,
        sort_order: data.length + 1,
      });
      if (error) throw error;
      setF({ title: "", subtitle: "", link: "", day: "" }); setFile(null);
      toast.success("Poster added"); refresh();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b px-5 py-3 font-mono text-xs tracking-widest text-muted-foreground">ACTIVITY POSTERS · HOME PAGE</div>
      <div className="divide-y">
        {data.map((p) => (
          <div key={p.id} className="grid gap-2 px-5 py-3 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-center">
            <Input defaultValue={p.title} onBlur={(e) => e.target.value.trim() && e.target.value !== p.title && patch(p.id, { title: e.target.value.trim() })} />
            <Input defaultValue={p.link_url ?? ""} placeholder="https://activity link" className="font-mono text-xs"
              onBlur={(e) => e.target.value !== (p.link_url ?? "") && patch(p.id, { link_url: e.target.value.trim() || null })} />
            <label className="flex items-center gap-2 text-sm"><Switch checked={p.is_active} onCheckedChange={(v) => patch(p.id, { is_active: v })} /> Show</label>
            <button onClick={() => del(p.id)} aria-label="Delete poster" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="grid gap-2 border-t p-5 md:grid-cols-2">
        <Input placeholder="Title" required minLength={2} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input placeholder="Subtitle (optional)" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
        <Input placeholder="https://activity link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
        <select value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">No day</option>{[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>Day {d}</option>)}
        </select>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit" disabled={busy}><Upload className="mr-1 h-4 w-4" />{busy ? "Uploading…" : "Add poster"}</Button>
      </form>
    </section>
  );
}
