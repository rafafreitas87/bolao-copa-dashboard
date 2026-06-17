"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { saveDevResult } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function saveOfficialResult(formData: FormData) {
  await requireAdmin();

  const matchNumber = Number(formData.get("matchNumber"));
  const matchId = String(formData.get("matchId") ?? "");
  const officialScoreA = Number(formData.get("officialScoreA"));
  const officialScoreB = Number(formData.get("officialScoreB"));

  if (
    !Number.isInteger(officialScoreA) ||
    !Number.isInteger(officialScoreB) ||
    officialScoreA < 0 ||
    officialScoreB < 0
  ) {
    redirect("/admin/resultados?error=Placar%20invalido");
  }

  if (!hasSupabaseEnv()) {
    await saveDevResult({
      matchNumber,
      officialScoreA,
      officialScoreB,
    });
    redirect("/admin/resultados?saved=1");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      official_score_a: officialScoreA,
      official_score_b: officialScoreB,
      status: "FINISHED",
    })
    .eq("id", matchId);

  if (error) {
    redirect(`/admin/resultados?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/resultados?saved=1");
}
