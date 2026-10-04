import { AnimatePresence, motion } from "motion/react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AchievementDialog({
  day,
  title,
  badgeUrl,
  onClose,
}: {
  day: number | null;
  title?: string | undefined;
  badgeUrl?: string | null | undefined;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {day !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="relative w-full max-w-sm rounded-3xl border bg-navy-gradient p-8 text-center shadow-neon"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-xs tracking-[0.3em] text-primary">ACHIEVEMENT UNLOCKED</div>
            <motion.div
              className="mx-auto my-6 h-40 w-40"
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 160, damping: 12 }}
            >
              {badgeUrl ? (
                <img src={badgeUrl} alt={`Mission ${day} badge`} className="h-full w-full drop-shadow-[0_0_30px_var(--primary)]" />
              ) : (
                <Trophy className="h-full w-full text-primary" />
              )}
            </motion.div>
            <h2 className="text-2xl font-bold">Mission {String(day).padStart(2, "0")} Badge</h2>
            {title && <p className="mt-1 text-muted-foreground">{title}</p>}
            <p className="mt-2 font-mono text-sm text-primary">+100 profile score</p>
            <Button className="mt-6 w-full" onClick={onClose}>Continue mission</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function playStamp() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    /* audio unavailable */
  }
}
