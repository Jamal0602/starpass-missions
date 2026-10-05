import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { adminResetActivation, adminSetPassword, adminUpdateContact } from "@/lib/passport.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Person = { passport_id: string; full_name: string; email: string; phone_number: string; user_id: string | null };

export function AdminPassportPanel({ people }: { people: Person[] }) {
  const qc = useQueryClient();
  const setPw = useServerFn(adminSetPassword);
  const update = useServerFn(adminUpdateContact);
  const resetAct = useServerFn(adminResetActivation);
  const [pid, setPid] = useState("");
  const [pw, setPwVal] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const person = people.find((p) => p.passport_id === pid.trim().toUpperCase());

  function pick(id: string) {
    setPid(id);
    const p = people.find((x) => x.passport_id === id.trim().toUpperCase());
    if (p) setForm({ full_name: p.full_name, email: p.email, phone: p.phone_number });
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Failed");
      else {
        toast.success(msg);
        qc.invalidateQueries({ queryKey: ["admin-participants"] });
      }
    } catch {
      toast.error("Check the values entered (password 8+ characters)");
    } finally {
      setBusy(false);
    }
  }

  const id = pid.trim().toUpperCase();
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-primary" /> Passport Control</h2>
      <p className="text-xs text-muted-foreground">Set a password, fix contact details or reset activation for any passport.</p>
      <div className="mt-3 space-y-1">
        <Label>Passport ID</Label>
        <Input list="pp-ids" value={pid} onChange={(e) => pick(e.target.value)} placeholder="SW26-SE-0001" className="font-mono uppercase" />
        <datalist id="pp-ids">{people.map((p) => <option key={p.passport_id} value={p.passport_id}>{p.full_name}</option>)}</datalist>
        {pid && (
          <p className="text-xs">
            {person ? `${person.full_name} · ${person.user_id ? "Active" : "Awaiting activation"}` : "No passport with this ID"}
          </p>
        )}
      </div>
      {person && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border p-3">
            <Label>New password</Label>
            <Input type="text" minLength={8} value={pw} onChange={(e) => setPwVal(e.target.value)} placeholder="min 8 characters" />
            <Button className="w-full" disabled={busy || pw.length < 8}
              onClick={() => run(() => setPw({ data: { passport_id: id, password: pw } }), `Password set for ${id}. Share it privately.`).then(() => setPwVal(""))}>
              Set password {person.user_id ? "" : "& activate"}
            </Button>
            <Button variant="outline" className="w-full" disabled={busy || !person.user_id}
              onClick={() => confirm(`Reset activation for ${id}? Their login is removed (badges stay).`) &&
                run(() => resetAct({ data: { passport_id: id } }), "Activation reset — they can set up again")}>
              Reset activation
            </Button>
          </div>
          <div className="space-y-2 rounded-xl border p-3">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            <Button variant="secondary" className="w-full" disabled={busy}
              onClick={() => run(() => update({ data: { passport_id: id, ...form } }), "Details updated")}>
              Save details
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
