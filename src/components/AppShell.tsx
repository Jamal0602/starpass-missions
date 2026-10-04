import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Rocket, ClipboardList, Trophy, IdCard, Newspaper, ShieldCheck, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { istNowParts } from "@/lib/mission";

const NAV = [
  { to: "/dashboard", label: "Missions", icon: Rocket },
  { to: "/activities", label: "Activities", icon: ClipboardList },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Passport", icon: IdCard },
] as const;

function IstClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const t = () => setNow(istNowParts().clock);
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-primary">IST {now ?? "--:--:--"}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="glass sticky top-0 z-40 hidden border-b md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest">
            <Rocket className="h-5 w-5 text-primary" /> ASTRAPASS
          </Link>
          <nav className="flex gap-1">
            {[...NAV, { to: "/feed", label: "Feed", icon: Newspaper } as const].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            {me?.isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-primary"
                activeProps={{ className: "bg-secondary" }}
              >
                <ShieldCheck className="h-4 w-4" /> Flight Control
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <IstClock />
            {me?.profile && <span className="font-mono text-xs text-muted-foreground">{me.profile.passport_id}</span>}
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest">
          <Rocket className="h-4 w-4 text-primary" /> ASTRAPASS
        </span>
        <div className="flex items-center gap-3">
          <IstClock />
          {me?.isAdmin && (
            <Link to="/admin" aria-label="Flight Control" className="text-primary">
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <button onClick={signOut} className="text-muted-foreground" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-8">{children}</main>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
