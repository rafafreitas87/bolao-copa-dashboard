"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const DEV_ADMIN_EMAIL = "admin@local.test";
const DEV_ADMIN_PASSWORD = "patasdegalinha1999";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (password === DEV_ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.delete("dev_participant_session");
      cookieStore.set("dev_admin_session", "true", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      redirect(next.startsWith("/") ? next : "/dashboard");
    }

    redirect("/login?error=Credenciais%20invalidas");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email || DEV_ADMIN_EMAIL,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("dev_admin_session");
  cookieStore.delete("dev_participant_session");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
