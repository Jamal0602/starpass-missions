import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LaunchLoader } from "@/components/LaunchLoader";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Wiki Library — AstraPass" },
      { name: "description", content: "Curated space articles and learning links for World Space Week trainees." },
      { property: "og:title", content: "Wiki Library — AstraPass" },
      { property: "og:description", content: "Curated space articles and learning links." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const cats = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const shown = items.filter(
    (i) => (cat === "All" || i.category === cat) && (i.title + " " + (i.description ?? "")).toLowerCase().includes(q.toLowerCase()),
  );

  async function remove(id: string) {
    const { error } = await supabase.from("library_items").delete().eq("id", id);
    if (error) return void toast.error("Could not delete");
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-mono text-xl font-bold tracking-widest text-primary">
          <BookOpen className="h-5 w-5" /> WIKI LIBRARY
        </h1>
        <p className="text-sm text-muted-foreground">Articles, resources and links to learn more about space.</p>
      </div>
      <Input placeholder="Search the library…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>
      {me?.isAdmin && <AddItem />}
      {isLoading ? (
        <LaunchLoader label="Loading library…" />
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((i) => (
            <div key={i.id} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{i.category}</div>
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-start gap-2 font-semibold">
                {i.title} <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
              {i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}
              {me?.isAdmin && (
                <button onClick={() => remove(i.id)} className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddItem() {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", url: "", description: "", category: "General" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//.test(f.url)) return void toast.error("Link must start with https://");
    const { error } = await supabase.from("library_items").insert({
      title: f.title.trim().slice(0, 150),
      url: f.url.trim(),
      description: f.description.trim().slice(0, 500) || null,
      category: f.category.trim().slice(0, 40) || "General",
    });
    if (error) return void toast.error("Could not add");
    toast.success("Added to library");
    setF({ title: "", url: "", description: "", category: f.category });
    qc.invalidateQueries({ queryKey: ["library"] });
  }
  return (
    <form onSubmit={add} className="grid gap-2 rounded-xl border border-dashed p-4 sm:grid-cols-2">
      <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      <Input placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required />
      <Input placeholder="Short description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <Input placeholder="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
      <Button type="submit" className="sm:col-span-2">Add resource</Button>
    </form>
  );
}
