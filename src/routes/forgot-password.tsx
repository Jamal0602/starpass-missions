import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/passport.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — AstraPass" },
      { name: "description", content: "Recover access to your AstraPass space passport." },
      { property: "og:title", content: "Forgot Password — AstraPass" },
      { property: "og:description", content: "Recover access to your AstraPass space passport." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const reset = useServerFn(requestPasswordReset);
  const [passport, setPassport] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await reset({ data: { passport_id: passport.trim().toUpperCase(), contact: contact.trim(), origin: window.location.origin } });
      setSent(true);
    } catch {
      toast.error("Check your Passport ID format (e.g. SW26-SE-0001)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Recover Access" subtitle="Confirm your passport and registered contact.">
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">
            If the details match an activated passport, a reset link has been sent to your registered email. Check your inbox and spam folder.
          </p>
          <Link to="/login" className="text-sm text-primary">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pid">Passport ID</Label>
            <Input id="pid" placeholder="SW26-SE-0001" className="font-mono uppercase" maxLength={20} value={passport} onChange={(e) => setPassport(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Registered phone or email</Label>
            <Input id="contact" maxLength={255} value={contact} onChange={(e) => setContact(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          <div className="text-center text-sm"><Link to="/login" className="text-muted-foreground hover:text-foreground">Back to login</Link></div>
        </form>
      )}
    </AuthCard>
  );
}
