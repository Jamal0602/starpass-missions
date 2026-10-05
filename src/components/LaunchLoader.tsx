import { Rocket } from "lucide-react";

export function LaunchLoader({ label = "Preparing launch…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary [animation-duration:1.4s]" />
        <div className="absolute inset-3 animate-spin rounded-full border border-primary/10 border-b-primary/70 [animation-direction:reverse] [animation-duration:2.2s]" />
        <Rocket className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-bounce text-primary" />
      </div>
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">{label.toUpperCase()}</p>
    </div>
  );
}
