import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const passportSchema = z.string().trim().toUpperCase().regex(/^(SP-2026-\d{4,}|SW26-[A-Z]{2}-\d{4,})$/, "Invalid Passport ID");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);
const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

type Admin = Awaited<ReturnType<typeof admin>>;

// Create the login account, or reuse one that already exists for this email (fixes half-finished activations).
async function ensureAuthUser(db: Admin, rawEmail: string, password: string): Promise<string | null> {
  const email = rawEmail.trim().toLowerCase();
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error && created.user) return created.user.id;
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const found = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      const { data: linked } = await db.from("profiles").select("id").eq("user_id", found.id).maybeSingle();
      if (linked) return null;
      await db.auth.admin.updateUserById(found.id, { password, email_confirm: true });
      return found.id;
    }
    if (!data || data.users.length < 200) break;
  }
  return null;
}

async function signIn(email: string, password: string) {
  const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) return { ok: false as const, error: "Invalid Passport ID or password" };
  return {
    ok: true as const,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

export const registerTrainee = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100),
        email: z.string().trim().toLowerCase().email().max(255),
        phone: z.string().trim().min(10).max(15),
        password: passwordSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const phone = digits(data.phone);
    const { data: existing } = await db
      .from("profiles")
      .select("id")
      .or(`email.eq.${data.email},phone_number.eq.${phone}`)
      .maybeSingle();
    if (existing) return { ok: false as const, error: "This email or phone is already enlisted" };

    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false as const, error: "Could not create account" };

    const { data: profile, error: pErr } = await db
      .from("profiles")
      .insert({ user_id: created.user.id, full_name: data.full_name, email: data.email, phone_number: phone })
      .select("passport_id")
      .single();
    if (pErr || !profile) {
      await db.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: "Could not issue passport" };
    }
    const session = await signIn(data.email, data.password);
    return { ...session, passport_id: profile.passport_id };
  });

export const checkPassport = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passport_id: passportSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db.from("profiles").select("user_id").eq("passport_id", data.passport_id).maybeSingle();
    if (!p) return { status: "not_found" as const };
    return { status: p.user_id ? ("active" as const) : ("needs_activation" as const) };
  });

export const loginWithPassport = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ passport_id: passportSchema, password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db
      .from("profiles")
      .select("email, user_id")
      .eq("passport_id", data.passport_id)
      .maybeSingle();
    if (!p || !p.user_id) return { ok: false as const, error: "Invalid Passport ID or password" };
    return signIn(p.email.trim().toLowerCase(), data.password);
  });

export const activatePassport = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ passport_id: passportSchema, contact: z.string().trim().min(5).max(255), password: passwordSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db
      .from("profiles")
      .select("id, email, phone_number, user_id")
      .eq("passport_id", data.passport_id)
      .maybeSingle();
    const matches =
      p && (p.email.toLowerCase() === data.contact.toLowerCase() || digits(p.phone_number) === digits(data.contact));
    if (!p || !matches || p.user_id) return { ok: false as const, error: "Details don't match our records" };

    const userId = await ensureAuthUser(db, p.email, data.password);
    if (!userId) return { ok: false as const, error: "Could not activate passport. Contact the admin." };
    await db.from("profiles").update({ user_id: userId }).eq("id", p.id);
    return signIn(p.email.toLowerCase(), data.password);
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ passport_id: passportSchema, contact: z.string().trim().min(5).max(255), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: p } = await db
      .from("profiles")
      .select("email, phone_number, user_id")
      .eq("passport_id", data.passport_id)
      .maybeSingle();
    const matches =
      p && (p.email.toLowerCase() === data.contact.toLowerCase() || digits(p.phone_number) === digits(data.contact));
    if (p && matches && p.user_id) {
      await publicClient().auth.resetPasswordForEmail(p.email, { redirectTo: `${data.origin}/reset-password` });
    }
    // Same response either way to avoid revealing account details
    return { ok: true as const };
  });

export const getMyContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data } = await db.from("profiles").select("email, phone_number").eq("user_id", context.userId).maybeSingle();
    return data ?? null;
  });

export const adminListParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const db = await admin();
    const { data } = await db
      .from("profiles")
      .select("id, passport_id, full_name, email, phone_number, user_id, is_pro, created_at, collected_badges(mission_day)")
      .order("created_at", { ascending: true });
    return data ?? [];
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ passport_id: passportSchema, password: passwordSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: p } = await db.from("profiles").select("id, email, user_id").eq("passport_id", data.passport_id).maybeSingle();
    if (!p) return { ok: false as const, error: "Passport not found" };
    if (p.user_id) {
      const { error } = await db.auth.admin.updateUserById(p.user_id, { password: data.password });
      if (error) return { ok: false as const, error: "Could not update password" };
      return { ok: true as const };
    }
    const userId = await ensureAuthUser(db, p.email, data.password);
    if (!userId) return { ok: false as const, error: "Could not create login" };
    await db.from("profiles").update({ user_id: userId }).eq("id", p.id);
    return { ok: true as const };
  });

export const adminUpdateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      passport_id: passportSchema,
      full_name: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email().max(255),
      phone: z.string().trim().min(10).max(15),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: p } = await db.from("profiles").select("id, user_id").eq("passport_id", data.passport_id).maybeSingle();
    if (!p) return { ok: false as const, error: "Passport not found" };
    if (p.user_id) {
      const { error } = await db.auth.admin.updateUserById(p.user_id, { email: data.email, email_confirm: true });
      if (error) return { ok: false as const, error: "Email already used by another account" };
    }
    const { error } = await db.from("profiles").update({ full_name: data.full_name, email: data.email, phone_number: digits(data.phone) }).eq("id", p.id);
    if (error) return { ok: false as const, error: "Could not save" };
    return { ok: true as const };
  });

export const adminResetActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ passport_id: passportSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: p } = await db.from("profiles").select("id, user_id").eq("passport_id", data.passport_id).maybeSingle();
    if (!p?.user_id) return { ok: false as const, error: "Passport is not activated" };
    if (p.user_id === context.userId) return { ok: false as const, error: "You cannot reset your own passport" };
    await db.from("profiles").update({ user_id: null }).eq("id", p.id);
    await db.auth.admin.deleteUser(p.user_id);
    return { ok: true as const };
  });
