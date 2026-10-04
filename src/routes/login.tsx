import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { activatePassport, checkPassport, loginWithPassport, requestPasswordReset } from "@/lib/passport.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Mission Clearance — AstraPass" },
      { name: "description", content: "Sign in with your AstraPass Passport ID to join today's space mission." },
      { property: "og:title", content: "Mission Clearance — AstraPass" },
      { property: "og:description", content: "Sign in with your Passport ID." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const check = useServerFn(checkPassport);
  const login = useServerFn(loginWithPassport);
  const activate = useServerFn(activatePassport);
  const reset = useServerFn(requestPasswordReset);

  const [passport, setPassport] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<null | "activate" | "forgot">(null);
  const [contact, setContact] = useState("");
  const [newPass, setNewPass] = useState("");

  async function finish(res: { ok: boolean; error?: string; access_token?: string; refresh_token?: string }) {
    if (!res.ok || !res.access_token) {
      toast.error(res.error ?? "Something went wrong");
      return;
    }
    await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token! });
    navigate({ to: "/dashboard" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = passport.trim().toUpperCase();
      const st = await check({ data: { passport_id: id } });
      if (st.status === "not_found") return void toast.error("Passport ID not found");
      if (st.status === "needs_activation") return void setMode("activate");
      await finish(await login({ data: { passport_id: id, password } }));
    } catch {
      toast.error("Check your Passport ID format (e.g. SW26-SE-0001)");
    } finally {
      setBusy(false);
    }
  }

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await finish(await activate({ data: { passport_id: passport.trim().toUpperCase(), contact, password: newPass } }));
    } catch {
      toast.error("Password must be at least 8 characters");
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await reset({ data: { passport_id: passport.trim().toUpperCase(), contact, origin: window.location.origin } });
      toast.success("If the details match, a reset link has been sent to your registered email.");
      setMode(null);
    } catch {
      toast.error("Check your Passport ID format");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Mission Clearance" subtitle="Enter your Passport ID to board.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pid">Passport ID</Label>
          <Input
            id="pid"
            placeholder="SW26-SE-0001"
            className="font-mono uppercase"
            value={passport}
            onChange={(e) => setPassport(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Verifying…" : "Board Mission"}
        </Button>
        <div className="flex justify-between text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => (passport ? setMode("forgot") : toast.error("Enter your Passport ID first"))}
          >
            Forgot password?
          </button>
          <Link to="/register" className="text-primary">
            Enlist as trainee
          </Link>
        </div>
      </form>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "activate" ? "First Mission Setup" : "Recover Access"}</DialogTitle>
            <DialogDescription>
              {mode === "activate"
                ? "Confirm your registered phone number or email, then set a password."
                : "Confirm your registered phone number or email to receive a reset link."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={mode === "activate" ? onActivate : onForgot} className="space-y-4">
            <div className="rounded-md bg-secondary px-3 py-2 font-mono text-sm">{passport.toUpperCase()}</div>
            <div className="space-y-2">
              <Label>Registered phone or email</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
            {mode === "activate" && (
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" minLength={8} value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "activate" ? "Activate Passport" : "Send reset link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AuthCard>
  );
}
