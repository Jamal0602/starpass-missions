import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, XCircle, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({
    meta: [
      { title: "Activity Arena — AstraPass" },
      { name: "description", content: "Solve space quiz challenges to boost your profile score." },
      { property: "og:title", content: "Activity Arena — AstraPass" },
      { property: "og:description", content: "Solve space quiz challenges to boost your profile score." },
    ],
  }),
  component: ActivitiesPage,
});

const DIFF: Record<string, string> = { easy: "text-primary", medium: "text-accent-foreground", hard: "text-destructive" };

function ActivitiesPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const pid = me?.profile?.id;
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [cat, setCat] = useState("Basic");
  const [openId, setOpenId] = useState<string | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correct_index: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["challenges", pid],
    enabled: !!pid,
    queryFn: async () => {
      const [c, a] = await Promise.all([
        supabase.from("challenges").select("id, title, question, options, category, difficulty, points").eq("is_active", true).order("created_at"),
        supabase.from("challenge_attempts").select("challenge_id, is_correct, selected_index, points_awarded").eq("profile_id", pid!),
      ]);
      if (c.error) throw c.error;
      return { list: c.data, attempts: a.data ?? [] };
    },
  });

  const list = useMemo(() => (data?.list ?? []).filter((c) => (cat === "All" || c.category === cat) && (filter === "all" || c.difficulty === filter)), [data, filter, cat]);
  const cats = ["All", ...Array.from(new Set((data?.list ?? []).map((c) => c.category))).sort((a, b) => (a === "Basic" ? -1 : b === "Basic" ? 1 : a.localeCompare(b)))];
  const attempts = new Map((data?.attempts ?? []).map((a) => [a.challenge_id, a]));
  const solved = (data?.attempts ?? []).filter((a) => a.is_correct).length;
  const pts = (data?.attempts ?? []).reduce((s, a) => s + a.points_awarded, 0);
  const open = data?.list.find((c) => c.id === openId);
  const prior = open ? attempts.get(open.id) : undefined;

  async function submit() {
    if (!open || choice === null) return;
    setBusy(true);
    const { data: r, error } = await supabase.rpc("submit_challenge", { _id: open.id, _choice: choice });
    setBusy(false);
    if (error) return void toast.error(error.message);
    const res = r as { correct: boolean; correct_index: number; points: number };
    setResult(res);
    res.correct ? toast.success(`Accepted · +${res.points} pts`) : toast.error("Wrong answer");
    qc.invalidateQueries({ queryKey: ["challenges"] });
    qc.invalidateQueries({ queryKey: ["scores"] });
  }

  function pick(id: string) {
    setOpenId(id);
    setChoice(null);
    setResult(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-mono text-xl font-bold tracking-widest text-primary"><Code2 className="h-5 w-5" /> ACTIVITY ARENA</h1>
          <p className="text-sm text-muted-foreground">One attempt per problem. Correct answers add points to your profile score.</p>
        </div>
        <div className="flex gap-4 font-mono text-sm">
          <span>Solved <b className="text-primary">{solved}/{data?.list.length ?? 0}</b></span>
          <span>Points <b className="text-primary">{pts}</b></span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${cat === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>{c}</button>
        ))}
      </div>

      <div className="flex gap-1">
        {(["all", "easy", "medium", "hard"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{f}</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {list.map((c, i) => {
            const a = attempts.get(c.id);
            return (
              <li key={c.id}>
                <button onClick={() => pick(c.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary ${openId === c.id ? "bg-secondary" : ""}`}>
                  {a ? (a.is_correct ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />) : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className="w-6 font-mono text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 truncate">{c.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{c.category}</span>
                  <span className={`w-14 text-right text-xs font-semibold capitalize ${DIFF[c.difficulty] ?? ""}`}>{c.difficulty}</span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No challenges yet.</li>}
        </ol>

        <div className="rounded-xl border bg-card p-5">
          {!open ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Select a problem to begin.</p>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-semibold capitalize ${DIFF[open.difficulty] ?? ""}`}>{open.difficulty}</span>
                <span className="text-muted-foreground">· {open.category} · {open.points} pts</span>
              </div>
              <h2 className="mt-2 text-lg font-bold">{open.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{open.question}</p>
              <div className="mt-4 space-y-2">
                {open.options.map((o, i) => {
                  const done = prior || result;
                  const sel = prior ? prior.selected_index === i : choice === i;
                  const right = result?.correct_index === i;
                  return (
                    <button key={i} disabled={!!done} onClick={() => setChoice(i)}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${right ? "border-primary bg-primary/15" : sel ? (done && !(prior?.is_correct ?? result?.correct) ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10") : "hover:bg-secondary"}`}>
                      <span className="mr-2 font-mono text-muted-foreground">{String.fromCharCode(65 + i)}.</span>{o}
                    </button>
                  );
                })}
              </div>
              {prior ? (
                <p className={`mt-4 font-mono text-sm ${prior.is_correct ? "text-primary" : "text-destructive"}`}>{prior.is_correct ? `Accepted · +${prior.points_awarded}` : "Attempted · Wrong answer"}</p>
              ) : !result && (
                <Button className="mt-4" disabled={choice === null || busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
