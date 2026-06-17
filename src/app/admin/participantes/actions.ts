"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createDevParticipant } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function createParticipant(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || name;
  const email = String(formData.get("email") ?? "").trim();

  if (!name) {
    redirect("/admin/participantes?error=Nome%20obrigatorio");
  }

  if (!hasSupabaseEnv()) {
    await createDevParticipant({ name, displayName, email });
    redirect("/admin/participantes?created=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("participants").insert({
    name,
    display_name: displayName,
    email: email || null,
    active: true,
  });

  if (error) {
    redirect(`/admin/participantes?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/participantes?created=1");
}
