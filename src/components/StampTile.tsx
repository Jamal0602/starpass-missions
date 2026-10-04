import { motion } from "motion/react";
import { Check, Lock, X, Clock } from "lucide-react";
import type { StampState } from "@/lib/mission";
import { cn } from "@/lib/utils";

const STYLES: Record<StampState, string> = {
  stamped: "border-primary/60 bg-primary/10 text-primary",
  active: "border-primary bg-navy-gradient text-primary pulse-neon",
  upcoming: "border-border bg-card text-foreground",
  locked: "border-border bg-card text-muted-foreground",
  missed: "border-destructive/40 bg-destructive/5 text-destructive/80",
};

const LABEL: Record<StampState, string> = {
  stamped: "Verified",
  active: "Claim now",
  upcoming: "Opens today",
  locked: "Locked",
  missed: "Missed / Void",
};

export function StampTile({
  day,
  theme,
  state,
  compact,
}: {
  day: number;
  theme: string;
  state: StampState;
  compact?: boolean;
}) {
  const Icon = state === "stamped" ? Check : state === "missed" ? X : state === "locked" ? Lock : Clock;
  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border text-center",
        compact ? "aspect-square p-2" : "p-4",
        STYLES[state],
      )}
    >
      <div className="font-mono text-[10px] tracking-widest opacity-80">DAY {String(day).padStart(2, "0")}</div>
      <motion.div
        key={state}
        initial={state === "stamped" ? { scale: 2, rotate: -20, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className={cn("my-2 grid place-items-center rounded-full border-2 border-current", compact ? "h-8 w-8" : "h-12 w-12")}
      >
        <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} />
      </motion.div>
      {!compact && <div className="line-clamp-1 text-xs text-foreground">{theme}</div>}
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider">{LABEL[state]}</div>
    </motion.div>
  );
}
