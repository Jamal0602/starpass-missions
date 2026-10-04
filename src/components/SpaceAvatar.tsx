import { Rocket, Satellite, Orbit, Moon, Telescope, Radar, Sun, Atom, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = [Rocket, Satellite, Orbit, Moon, Telescope, Radar, Sun, Atom, Globe, Sparkles];

export function avatarIndex(passportId: string) {
  let h = 0;
  for (const c of passportId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 10;
}

export function SpaceAvatar({
  passportId,
  url,
  className,
}: {
  passportId: string;
  url?: string | null;
  className?: string;
}) {
  if (url) return <img src={url} alt="" className={cn("rounded-full object-cover", className)} />;
  const Icon = ICONS[avatarIndex(passportId)];
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-navy-gradient text-primary ring-1 ring-primary/40",
        className,
      )}
    >
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}
