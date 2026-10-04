import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { registerTrainee } from "@/lib/passport.functions";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Trainee Enlistment — AstraPass" },
      { name: "description", content: "Enlist for World Space Week and receive your AstraPass Passport ID." },
      { property: "og:title", content: "Trainee Enlistment — AstraPass" },
      { property: "og:description", content: "Get your Space Week Passport ID." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerTrainee);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await register({ data: form });
      if (!res.ok || !("access_token" in res)) return void toast.error(res.error ?? "Enlistment failed");
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      setIssued(res.passport_id);
    } catch {
      toast.error("Please check your details (password needs 8+ characters)");
    } finally {
      setBusy(false);
    }
  }

  if (issued) {
    return (
      <AuthCard title="Passport Issued" subtitle="Save this ID — you'll use it to sign in.">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl border border-primary/50 bg-secondary p-6 text-center shadow-neon"
        >
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Passport ID</div>
          <div className="mt-2 font-mono text-3xl font-bold text-primary">{issued}</div>
        </motion.div>
        <Button className="mt-6 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Enter Flight Deck
        </Button>
      </AuthCard>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <AuthCard title="Trainee Enlistment" subtitle="Join World Space Week and get your passport.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={set("full_name")} required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="space-y-2">
          <Label>Phone number</Label>
          <Input type="tel" value={form.phone} onChange={set("phone")} required placeholder="10-digit mobile" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" minLength={8} value={form.password} onChange={set("password")} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Issuing passport…" : "Enlist"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have a passport?{" "}
          <Link to="/login" className="text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
