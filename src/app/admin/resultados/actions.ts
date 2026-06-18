"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { saveDevResult } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function saveOfficialResults(formData: FormData) {
  await requireAdmin();

  const results: Array<{
    matchId: string;
    matchNumber: number;
    officialScoreA: number;
    officialScoreB: number;
  }> = [];

  for (const value of formData.getAll("matchId")) {
    const matchId = String(value);
    const matchNumber = Number(formData.get(`matchNumber-${matchId}`));
    const scoreAValue = String(formData.get(`officialScoreA-${matchId}`) ?? "").trim();
    const scoreBValue = String(formData.get(`officialScoreB-${matchId}`) ?? "").trim();

    if (!scoreAValue && !scoreBValue) {
      continue;
    }

    if (!scoreAValue || !scoreBValue) {
      redirect(
        "/admin/resultados?error=Preencha%20os%20dois%20placares%20do%20jogo%20ou%20deixe%20os%20dois%20em%20branco",
      );
    }

    const officialScoreA = Number(scoreAValue);
    const officialScoreB = Number(scoreBValue);

    if (
      !Number.isInteger(matchNumber) ||
      !Number.isInteger(officialScoreA) ||
      !Number.isInteger(officialScoreB) ||
      officialScoreA < 0 ||
      officialScoreB < 0
    ) {
      redirect("/admin/resultados?error=Placar%20invalido");
    }

    results.push({
      matchId,
      matchNumber,
      officialScoreA,
      officialScoreB,
    });
  }

  if (results.length === 0) {
    redirect("/admin/resultados?error=Nenhum%20placar%20informado");
  }

  if (!hasSupabaseEnv()) {
    for (const result of results) {
      await saveDevResult(result);
    }

    redirect(`/admin/resultados?saved=${results.length}`);
  }

  const supabase = await createClient();

  for (const result of results) {
    const { error } = await supabase
      .from("matches")
      .update({
        official_score_a: result.officialScoreA,
        official_score_b: result.officialScoreB,
        status: "FINISHED",
      })
      .eq("id", result.matchId);

    if (error) {
      redirect(`/admin/resultados?error=${encodeURIComponent(error.message)}`);
    }
  }

  redirect(`/admin/resultados?saved=${results.length}`);
}
