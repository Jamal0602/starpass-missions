import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpaceAvatar } from "@/components/SpaceAvatar";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Orbit Leaderboard — AstraPass" },
      { name: "description", content: "Master, Badge, Activity and Skill rankings for World Space Week." },
      { property: "og:title", content: "Orbit Leaderboard — AstraPass" },
      { property: "og:description", content: "Master, Badge, Activity and Skill rankings for World Space Week." },
    ],
  }),
  component: LeaderboardPage,
});

type Tab = "master" | "badges" | "activities" | "skills";
const TABS: { id: Tab; label: string }[] = [
  { id: "master", label: "Master" },
  { id: "badges", label: "Stamps" },
  { id: "activities", label: "Activities" },
  { id: "skills", label: "Skills" },
];

function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("master");
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [p, b, a] = await Promise.all([
        supabase.from("profiles").select("id, passport_id, full_name, callsign, avatar_url, skills, is_pro"),
        supabase.from("collected_badges").select("profile_id, claim_speed_seconds"),
        supabase.rpc("profile_scores"),
      ]);
      if (p.error) throw p.error;
      return { profiles: p.data, badges: b.data ?? [], scores: a.data ?? [] };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return data.profiles
      .map((p) => {
        const mine = data.badges.filter((x) => x.profile_id === p.id);
        const stamps = mine.length;
        const speed = mine.reduce((s, x) => s + (x.claim_speed_seconds ?? 5400), 0);
        const sc = data.scores.find((x) => x.profile_id === p.id);
        const skills = p.skills?.length ?? 0;
        const val = { master: sc?.score ?? 0, badges: stamps, activities: (sc?.missions ?? 0) + (sc?.solved ?? 0), skills }[tab];
        return { p, val, speed };
      })
      .filter((r) => r.val > 0)
      .sort((a, b) => b.val - a.val || a.speed - b.speed)
      .slice(0, 100);
  }, [data, tab]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
      <h1 className="font-mono text-xl font-bold tracking-widest text-primary">ORBIT LEADERBOARD</h1>
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-md py-2 text-xs font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No rankings yet — collect stamps to enter orbit.</p>
      ) : (
        <ol className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((r, i) => (
            <li key={r.p.id} className={`flex items-center gap-3 px-4 py-3 ${r.p.id === me?.profile?.id ? "bg-primary/10" : ""}`}>
              <span className="w-6 font-mono text-sm text-muted-foreground">{i + 1}</span>
              <SpaceAvatar passportId={r.p.passport_id} url={r.p.avatar_url} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <Link to="/p/$passportId" params={{ passportId: r.p.passport_id }} className="block truncate text-sm font-semibold hover:text-primary">{r.p.callsign || r.p.full_name}</Link>
                <div className="font-mono text-xs text-muted-foreground">{r.p.passport_id}</div>
              </div>
              <span className="font-mono font-bold text-primary">{r.val}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
