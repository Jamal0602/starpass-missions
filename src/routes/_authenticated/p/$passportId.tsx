import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Github, Instagram, Linkedin, MapPin, GraduationCap, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SpaceAvatar } from "@/components/SpaceAvatar";
import { LaunchLoader } from "@/components/LaunchLoader";

export const Route = createFileRoute("/_authenticated/p/$passportId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.passportId} — AstraPass Explorer` },
      { name: "description", content: "AstraPass explorer passport: badges, skills and Space Week journey." },
      { property: "og:title", content: `${params.passportId} — AstraPass Explorer` },
      { property: "og:description", content: "AstraPass explorer passport and Space Week badges." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfile,
});

const safe = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

function PublicProfile() {
  const { passportId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", passportId],
    queryFn: async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, passport_id, full_name, callsign, avatar_url, bio, is_pro, skills, interests, languages, location, education, goals, linkedin_url, github_url, instagram_url, category")
        .eq("passport_id", passportId.toUpperCase())
        .maybeSingle();
      if (!p) return null;
      const [{ data: b }, { data: posts }] = await Promise.all([
        supabase.from("collected_badges").select("mission_day").eq("profile_id", p.id),
        supabase.from("posts").select("id, title, created_at").eq("profile_id", p.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return { p, days: new Set((b ?? []).map((x) => x.mission_day)), posts: posts ?? [] };
    },
  });
  const { data: schedule = [] } = useQuery({
    queryKey: ["badge-art"],
    queryFn: async () => (await supabase.from("mission_schedules").select("mission_day, badge_url, theme").order("mission_day")).data ?? [],
  });

  if (isLoading) return <LaunchLoader label="Locating explorer…" />;
  if (!data) return <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center text-muted-foreground">Passport not found.</div>;
  const { p, days, posts } = data;
  const links = [
    [safe(p.linkedin_url), Linkedin, "LinkedIn"], [safe(p.github_url), Github, "GitHub"], [safe(p.instagram_url), Instagram, "Instagram"],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to ranks</Link>
      <section className="glass rounded-3xl border p-6">
        <div className="flex items-center gap-4">
          <SpaceAvatar passportId={p.passport_id} url={p.avatar_url} className="h-20 w-20" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{p.callsign || p.full_name}</h1>
            {p.callsign && <div className="text-sm text-muted-foreground">{p.full_name}</div>}
            <div className="font-mono text-sm text-primary">{p.passport_id}</div>
            {p.is_pro && <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-xs text-primary"><Award className="h-3 w-3" /> Pioneer</span>}
          </div>
        </div>
        {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {p.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
          {p.education && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{p.education}</span>}
        </div>
        {[["Skills", p.skills], ["Interests", p.interests], ["Languages", p.languages]].map(([label, arr]) =>
          (arr as string[])?.length ? (
            <div key={label as string} className="mt-3">
              <div className="font-mono text-[11px] tracking-widest text-muted-foreground">{(label as string).toUpperCase()}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">{(arr as string[]).map((s) => <span key={s} className="rounded-full border px-2 py-0.5 text-xs">{s}</span>)}</div>
            </div>
          ) : null,
        )}
        {p.goals && <p className="mt-3 text-sm text-muted-foreground"><span className="text-foreground">Space goal:</span> {p.goals}</p>}
        <div className="mt-4 flex gap-3">
          {links.map(([u, Icon, label]) => u && <a key={label} href={u} target="_blank" rel="noopener noreferrer nofollow" aria-label={label} className="text-muted-foreground hover:text-primary"><Icon className="h-5 w-5" /></a>)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm tracking-widest text-muted-foreground">BADGES · {days.size}/7</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {schedule.map((s) => (
            <div key={s.mission_day} className={`text-center ${days.has(s.mission_day) ? "" : "opacity-25 grayscale"}`}>
              {s.badge_url ? <img src={s.badge_url} alt={s.theme} className="mx-auto aspect-square w-full rounded-full object-cover" /> : <div className="aspect-square rounded-full border" />}
              <div className="mt-1 font-mono text-[10px]">DAY {s.mission_day}</div>
            </div>
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground">SHOWCASE POSTS</h2>
          <ul className="mt-2 space-y-1 text-sm">{posts.map((x) => <li key={x.id}><Link to="/feed" className="hover:text-primary">{x.title}</Link></li>)}</ul>
        </section>
      )}
    </div>
  );
}
