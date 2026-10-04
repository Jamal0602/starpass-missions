import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — AstraPass" },
      { name: "description", content: "Set a new password for your AstraPass passport." },
      { property: "og:title", content: "Reset Password — AstraPass" },
      { property: "og:description", content: "Set a new AstraPass password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return void toast.error("Reset link expired. Request a new one.");
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthCard title="Reset Password" subtitle="Choose a new password for your passport.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>New password</Label>
          <Input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
