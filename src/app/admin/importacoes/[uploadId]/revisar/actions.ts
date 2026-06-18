"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  getDevUpload,
  readDevUploadBytes,
  saveDevPredictionsForUpload,
} from "@/lib/dev-store";
import { parseUploadPreview } from "@/lib/import/parse-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { saveSupabasePredictionsForParticipant } from "@/lib/supabase/read-model";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

export async function approveDetectedPredictions(formData: FormData) {
  await requireAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");

  const upload = hasSupabaseEnv() ? await getSupabaseUpload(uploadId) : await getDevUpload(uploadId);

  if (!upload) {
    redirect("/admin/importacoes/nova?error=Upload%20nao%20encontrado");
  }

  const bytes = hasSupabaseEnv()
    ? await readSupabaseUploadBytes(upload.storagePath)
    : await readDevUploadBytes(upload);
  const preview = await parseUploadPreview(upload, bytes);

  if (
    (preview.kind !== "pdf" && preview.kind !== "excel") ||
    preview.detectedPredictions.length === 0
  ) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Nenhum%20palpite%20detectado`);
  }

  if (hasSupabaseEnv()) {
    await saveSupabasePredictionsForUpload({
      upload,
      predictions: preview.detectedPredictions,
    });
  } else {
    await saveDevPredictionsForUpload({
      upload,
      participantId: upload.participantId,
      predictions: preview.detectedPredictions,
    });
  }

  redirect(`/admin/importacoes/${uploadId}/revisar?approved=1`);
}

export async function saveManualPredictions(formData: FormData) {
  await requireAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");

  const upload = hasSupabaseEnv() ? await getSupabaseUpload(uploadId) : await getDevUpload(uploadId);

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

  if (hasSupabaseEnv()) {
    await saveSupabasePredictionsForUpload({
      upload,
      predictions,
    });
  } else {
    await saveDevPredictionsForUpload({
      upload,
      participantId: upload.participantId,
      predictions,
    });
  }

  redirect(`/admin/importacoes/${uploadId}/revisar?approved=1&manual=${predictions.length}`);
}

async function getSupabaseUpload(uploadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, participant_id, file_name, file_type, storage_path, uploaded_at, status")
    .eq("id", uploadId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    participantId: data.participant_id,
    fileName: data.file_name,
    fileType: data.file_type,
    storagePath: data.storage_path,
    uploadedAt: data.uploaded_at,
    status: "UPLOADED" as const,
  };
}

async function readSupabaseUploadBytes(storagePath: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("bolao-uploads").download(storagePath);

  if (error) {
    throw new Error(error.message);
  }

  return Buffer.from(await data.arrayBuffer());
}

async function saveSupabasePredictionsForUpload(input: {
  upload: {
    id: string;
    participantId: string;
    fileName: string;
  };
  predictions: Array<{
    matchNumber: number;
    predictedScoreA: number;
    predictedScoreB: number;
  }>;
}) {
  const supabase = createAdminClient();
  await saveSupabasePredictionsForParticipant({
    participantId: input.upload.participantId,
    uploadId: input.upload.id,
    sourceFileName: input.upload.fileName,
    predictions: input.predictions,
  });

  await supabase
    .from("uploads")
    .update({ status: "CONFIRMED", confirmed_at: new Date().toISOString() })
    .eq("id", input.upload.id);
}
