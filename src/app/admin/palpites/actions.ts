"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { resetAllDevPredictions } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function resetAllPredictions() {
  await requireAdmin();

  if (hasSupabaseEnv()) {
    redirect("/admin/palpites?error=Reset%20Supabase%20pendente");
  }

  await resetAllDevPredictions();
  redirect("/admin/palpites?reset=1");
}
