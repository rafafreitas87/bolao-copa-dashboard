"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  listDevParticipants,
  saveDevPredictionsForParticipant,
} from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

export async function saveParticipantPredictions(formData: FormData) {
  await requireAdmin();

  const participantId = String(formData.get("participantId") ?? "");

  if (hasSupabaseEnv()) {
    redirect(`/admin/palpites/${participantId}?error=Edicao%20Supabase%20pendente`);
  }

  const participants = await listDevParticipants();
  const participant = participants.find((row) => row.id === participantId);

  if (!participant) {
    redirect("/admin/palpites?error=Participante%20nao%20encontrado");
  }

  const fixtures = await getGroupStageFixtures();
  const predictions = fixtures
    .map((fixture) => {
      const scoreA = String(formData.get(`scoreA_${fixture.matchNumber}`) ?? "").trim();
      const scoreB = String(formData.get(`scoreB_${fixture.matchNumber}`) ?? "").trim();

      if (scoreA === "" || scoreB === "") {
        return null;
      }

      const predictedScoreA = Number(scoreA);
      const predictedScoreB = Number(scoreB);

      if (
        !Number.isInteger(predictedScoreA) ||
        !Number.isInteger(predictedScoreB) ||
        predictedScoreA < 0 ||
        predictedScoreB < 0
      ) {
        return null;
      }

      return {
        matchNumber: fixture.matchNumber,
        teamA: fixture.homeTeam,
        teamB: fixture.awayTeam,
        predictedScoreA,
        predictedScoreB,
      };
    })
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction));

  await saveDevPredictionsForParticipant({
    participantId,
    predictions,
    sourceFileName: "Edicao manual",
  });

  redirect(`/admin/palpites/${participantId}?saved=1`);
}
