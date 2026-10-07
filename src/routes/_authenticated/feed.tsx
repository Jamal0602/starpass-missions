import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { uploadImage, useMediaUrl } from "@/lib/media";
import { SpaceAvatar } from "@/components/SpaceAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Explorer Showcase — AstraPass" },
      { name: "description", content: "Educational space projects and builds shared by AstraPass explorers." },
      { property: "og:title", content: "Explorer Showcase — AstraPass" },
      { property: "og:description", content: "Educational space projects and builds shared by AstraPass explorers." },
    ],
  }),
  component: FeedPage,
});

const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

function PostImage({ path }: { path: string | null }) {
  const src = useMediaUrl(path);
  return src ? <img src={src} alt="" loading="lazy" className="mt-3 max-h-96 w-full rounded-lg object-cover" /> : null;
}

function FeedPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [form, setForm] = useState({ title: "", body: "", link: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: posts = [] } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, body, link_url, image_url, created_at, profile_id, profiles(passport_id, full_name, callsign, avatar_url, is_pro)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.profile) return;
    const link = form.link.trim();
    if (link && !safeUrl(link)) return void toast.error("Link must start with https://");
    setBusy(true);
    try {
      const image_url = file ? await uploadImage(file) : null;
      const { error } = await supabase.from("posts").insert({
        profile_id: me.profile.id,
        title: form.title.trim().slice(0, 120),
        body: form.body.trim().slice(0, 3000),
        link_url: link || null,
        image_url,
      });
      if (error) throw error;
      setForm({ title: "", body: "", link: "" });
      setFile(null);
      toast.success("Published to the showcase");
      qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return void toast.error("Could not delete");
    qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28">
      <h1 className="font-mono text-xl font-bold tracking-widest text-primary">EXPLORER SHOWCASE</h1>
      {me?.profile && (
        <form onSubmit={publish} className="space-y-2 rounded-xl border border-border bg-card p-4">
          <Input placeholder="Title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
          <Textarea placeholder="Share an educational project, build, drawing or learning…" rows={4} maxLength={3000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required minLength={10} />
          <Input placeholder="https://link (optional)" maxLength={500} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-primary">
              <ImagePlus className="h-4 w-4" /> {file ? file.name.slice(0, 24) : "Add photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <Button type="submit" disabled={busy} className="ml-auto">{busy ? "Publishing…" : "Publish"}</Button>
          </div>
        </form>
      )}
      {posts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No posts yet.</p>}
      {posts.map((post) => {
        const a = post.profiles;
        const url = safeUrl(post.link_url);
        const canDelete = me?.isAdmin || post.profile_id === me?.profile?.id;
        return (
          <article key={post.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {a && <SpaceAvatar passportId={a.passport_id} url={a.avatar_url} className="h-9 w-9" />}
              <div className="flex-1">
                {a ? (
                  <Link to="/p/$passportId" params={{ passportId: a.passport_id }} className="text-sm font-semibold hover:text-primary">
                    {a.callsign || a.full_name}{a.is_pro ? " · Pioneer" : ""}
                  </Link>
                ) : null}
                <div className="font-mono text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
              </div>
              {canDelete && <button onClick={() => remove(post.id)} aria-label="Delete post" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <h2 className="mt-3 font-semibold">{post.title}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>
            <PostImage path={post.image_url} />
            {url && <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-sm text-primary">Open link <ExternalLink className="h-3 w-3" /></a>}
          </article>
        );
      })}
    </div>
  );
}
