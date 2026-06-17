"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  getDevUpload,
  readDevUploadBytes,
  saveDevPredictionsForUpload,
} from "@/lib/dev-store";
import { parseUploadPreview } from "@/lib/import/parse-upload";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

export async function approveDetectedPredictions(formData: FormData) {
  await requireAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");

  if (hasSupabaseEnv()) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Confirmacao%20Supabase%20pendente`);
  }

  const upload = await getDevUpload(uploadId);

  if (!upload) {
    redirect("/admin/importacoes/nova?error=Upload%20nao%20encontrado");
  }

  const preview = await parseUploadPreview(upload, await readDevUploadBytes(upload));

  if (
    (preview.kind !== "pdf" && preview.kind !== "excel") ||
    preview.detectedPredictions.length === 0
  ) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Nenhum%20palpite%20detectado`);
  }

  await saveDevPredictionsForUpload({
    upload,
    participantId: upload.participantId,
    predictions: preview.detectedPredictions,
  });

  redirect(`/admin/importacoes/${uploadId}/revisar?approved=1`);
}

export async function saveManualPredictions(formData: FormData) {
  await requireAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");

  if (hasSupabaseEnv()) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Digitacao%20manual%20Supabase%20pendente`);
  }

  const upload = await getDevUpload(uploadId);

  if (!upload) {
    redirect("/admin/importacoes/nova?error=Upload%20nao%20encontrado");
  }

  const fixtures = await getGroupStageFixtures();
  const predictions = fixtures
    .map((fixture) => {
      const scoreA = String(formData.get(`scoreA_${fixture.matchNumber}`) ?? "");
      const scoreB = String(formData.get(`scoreB_${fixture.matchNumber}`) ?? "");

      if (scoreA === "" || scoreB === "") {
        return null;
      }

      return {
        matchNumber: fixture.matchNumber,
        teamA: fixture.homeTeam,
        teamB: fixture.awayTeam,
        predictedScoreA: Number(scoreA),
        predictedScoreB: Number(scoreB),
      };
    })
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction));

  if (predictions.length === 0) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Nenhum%20palpite%20digitado`);
  }

  await saveDevPredictionsForUpload({
    upload,
    participantId: upload.participantId,
    predictions,
  });

  redirect(`/admin/importacoes/${uploadId}/revisar?approved=1&manual=${predictions.length}`);
}
