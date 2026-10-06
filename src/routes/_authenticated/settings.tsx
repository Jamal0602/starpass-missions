import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AstraPass" },
      { name: "description", content: "Manage your AstraPass appearance and account preferences." },
      { property: "og:title", content: "Settings — AstraPass" },
      { property: "og:description", content: "Manage your AstraPass preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Passport</Link>
      <h1 className="font-mono text-xl font-bold tracking-widest text-primary">SETTINGS</h1>
      <label className="flex items-center justify-between rounded-xl border bg-card p-4">
        <span><span className="block font-semibold">Light theme</span><span className="text-sm text-muted-foreground">Switch between dark space and light mode.</span></span>
        <Switch checked={theme === "light"} onCheckedChange={(v) => setTheme(v ? "light" : "dark")} />
      </label>
      <Link to="/forgot-password" className="block rounded-xl border bg-card p-4 text-sm hover:border-primary">Change password</Link>
    </div>
  );
}
