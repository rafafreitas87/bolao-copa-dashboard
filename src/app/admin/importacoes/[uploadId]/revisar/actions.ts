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

type ApprovalUpload = {
  id: string;
  participantId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  uploadedAt: string;
  status: "UPLOADED";
};

export async function approveDetectedPredictions(formData: FormData) {
  await requireAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");
  const detectedPredictionsFromForm = parseDetectedPredictionsFromForm(formData);

  const upload = hasSupabaseEnv() ? await getSupabaseUpload(uploadId) : await getDevUpload(uploadId);

  if (!upload) {
    redirect("/admin/importacoes/nova?error=Upload%20nao%20encontrado");
  }

  const detectedPredictions =
    detectedPredictionsFromForm.length > 0
      ? detectedPredictionsFromForm
      : await parseDetectedPredictionsFromUpload(upload);

  if (detectedPredictions.length === 0) {
    redirect(`/admin/importacoes/${uploadId}/revisar?error=Nenhum%20palpite%20detectado`);
  }

  if (hasSupabaseEnv()) {
    try {
      await saveSupabasePredictionsForUpload({
        upload,
        predictions: detectedPredictions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao aprovar palpites";
      redirect(`/admin/importacoes/${uploadId}/revisar?error=${encodeURIComponent(message)}`);
    }
  } else {
    await saveDevPredictionsForUpload({
      upload,
      participantId: upload.participantId,
      predictions: detectedPredictions,
    });
  }

  redirect(`/admin/importacoes/${uploadId}/revisar?approved=1`);
}

function parseDetectedPredictionsFromForm(formData: FormData) {
  const raw = String(formData.get("detectedPredictionsJson") ?? "");

  if (!raw) {
    return [];
  }

  try {
    const rows = JSON.parse(raw) as unknown;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }

        const value = row as Record<string, unknown>;
        const matchNumber = toInteger(value.matchNumber);
        const predictedScoreA = toInteger(value.predictedScoreA);
        const predictedScoreB = toInteger(value.predictedScoreB);
        const teamA = toText(value.teamA);
        const teamB = toText(value.teamB);

        if (
          !matchNumber ||
          matchNumber < 1 ||
          matchNumber > 72 ||
          predictedScoreA === null ||
          predictedScoreB === null ||
          !teamA ||
          !teamB
        ) {
          return null;
        }

        return {
          matchNumber,
          teamA,
          teamB,
          predictedScoreA,
          predictedScoreB,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  } catch {
    return [];
  }
}

async function parseDetectedPredictionsFromUpload(upload: ApprovalUpload) {
  const bytes = hasSupabaseEnv()
    ? await readSupabaseUploadBytes(upload.storagePath)
    : await readDevUploadBytes(upload);
  const preview = await parseUploadPreview(upload, bytes);

  if (preview.kind !== "pdf" && preview.kind !== "excel" && preview.kind !== "image") {
    return [];
  }

  return preview.detectedPredictions;
}

function toInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(number) && number >= 0 ? number : null;
}

function toText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
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
    try {
      await saveSupabasePredictionsForUpload({
        upload,
        predictions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar palpites";
      redirect(`/admin/importacoes/${uploadId}/revisar?error=${encodeURIComponent(message)}`);
    }
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
