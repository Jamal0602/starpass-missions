import { Rocket } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border bg-card"
      >
        <div className="bg-navy-gradient px-6 py-6">
          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.3em] text-primary">
            <Rocket className="h-4 w-4" /> ASTRAPASS · WSW 2026
          </div>
          <h1 className="mt-3 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}
