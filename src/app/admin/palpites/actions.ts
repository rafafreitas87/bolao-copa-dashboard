"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { resetAllDevPredictions } from "@/lib/dev-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function resetAllPredictions() {
  await requireAdmin();

  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    const { error: scoresError } = await supabase
      .from("prediction_scores")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (scoresError) {
      redirect(`/admin/palpites?error=${encodeURIComponent(scoresError.message)}`);
    }

    const { error: predictionsError } = await supabase
      .from("predictions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (predictionsError) {
      redirect(`/admin/palpites?error=${encodeURIComponent(predictionsError.message)}`);
    }

    redirect("/admin/palpites?reset=1");
  }

  await resetAllDevPredictions();
  redirect("/admin/palpites?reset=1");
}
