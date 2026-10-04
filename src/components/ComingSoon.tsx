import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <div className="mt-6 inline-block rounded-full border border-primary/40 px-3 py-1 font-mono text-xs text-primary">
        DEPLOYING SOON
      </div>
    </div>
  );
}
