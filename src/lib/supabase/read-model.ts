import type { DevParticipant, DevPrediction, DevResult } from "@/lib/dev-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

export async function listSupabaseParticipants(): Promise<DevParticipant[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, display_name, email, active, created_at, updated_at")
    .order("display_name");

  if (error) {
    throw new Error(error.message);
  }

  return data.map((participant) => ({
    id: participant.id,
    name: participant.name,
    displayName: participant.display_name,
    email: participant.email,
    active: participant.active,
    createdAt: participant.created_at,
    updatedAt: participant.updated_at,
  }));
}

export async function listSupabaseResults(): Promise<DevResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("source_match_number, official_score_a, official_score_b, status, updated_at")
    .eq("status", "FINISHED")
    .not("source_match_number", "is", null)
    .order("source_match_number");

  if (error) {
    throw new Error(error.message);
  }

  return data
    .filter(
      (match) =>
        match.source_match_number &&
        match.official_score_a !== null &&
        match.official_score_b !== null,
    )
    .map((match) => ({
      matchNumber: match.source_match_number!,
      officialScoreA: match.official_score_a!,
      officialScoreB: match.official_score_b!,
      status: "FINISHED",
      updatedAt: match.updated_at,
    }));
}

export async function listSupabasePredictions(): Promise<DevPrediction[]> {
  const supabase = createAdminClient();
  const fixtures = await getGroupStageFixtures();
  const fixtureByMatchNumber = new Map(fixtures.map((fixture) => [fixture.matchNumber, fixture]));
  const [{ data, error }, { data: matches, error: matchesError }] = await Promise.all([
    supabase
      .from("predictions")
      .select(
        "id, participant_id, match_id, predicted_score_a, predicted_score_b, source_file_name, source_upload_id, created_at",
      ),
    supabase.from("matches").select("id, source_match_number"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const matchNumberById = new Map(matches.map((match) => [match.id, match.source_match_number]));

  return data
    .map((prediction) => {
      const matchNumber = matchNumberById.get(prediction.match_id);
      const fixture = matchNumber ? fixtureByMatchNumber.get(matchNumber) : null;

      if (!matchNumber || !fixture) {
        return null;
      }

      return {
        id: prediction.id,
        participantId: prediction.participant_id,
        uploadId: prediction.source_upload_id ?? "SUPABASE",
        matchNumber,
        teamA: fixture.homeTeam,
        teamB: fixture.awayTeam,
        predictedScoreA: prediction.predicted_score_a,
        predictedScoreB: prediction.predicted_score_b,
        sourceFileName: prediction.source_file_name ?? "Supabase",
        confirmedAt: prediction.created_at,
      };
    })
    .filter((prediction): prediction is DevPrediction => Boolean(prediction));
}

export async function listSupabasePredictionsByParticipant(
  participantId: string,
): Promise<DevPrediction[]> {
  const predictions = await listSupabasePredictions();

  return predictions
    .filter((prediction) => prediction.participantId === participantId)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

export async function listSupabasePredictionsByUpload(uploadId: string): Promise<DevPrediction[]> {
  const predictions = await listSupabasePredictions();

  return predictions
    .filter((prediction) => prediction.uploadId === uploadId)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

export async function saveSupabasePredictionsForParticipant(input: {
  participantId: string;
  uploadId?: string | null;
  sourceFileName?: string | null;
  replaceParticipant?: boolean;
  predictions: Array<{
    matchNumber: number;
    predictedScoreA: number;
    predictedScoreB: number;
  }>;
}) {
  const supabase = createAdminClient();

  if (input.replaceParticipant) {
    const { error: deleteScoresError } = await supabase
      .from("prediction_scores")
      .delete()
      .eq("participant_id", input.participantId);

    if (deleteScoresError) {
      throw new Error(deleteScoresError.message);
    }

    const { error: deletePredictionsError } = await supabase
      .from("predictions")
      .delete()
      .eq("participant_id", input.participantId);

    if (deletePredictionsError) {
      throw new Error(deletePredictionsError.message);
    }
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, source_match_number")
    .in(
      "source_match_number",
      input.predictions.map((prediction) => prediction.matchNumber),
    );

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const matchIdByNumber = new Map(matches.map((match) => [match.source_match_number, match.id]));
  const rows = input.predictions
    .map((prediction) => {
      const matchId = matchIdByNumber.get(prediction.matchNumber);

      if (!matchId) {
        return null;
      }

      return {
        participant_id: input.participantId,
        match_id: matchId,
        predicted_score_a: prediction.predictedScoreA,
        predicted_score_b: prediction.predictedScoreB,
        source_file_name: input.sourceFileName ?? "Edicao manual",
        source_upload_id: input.uploadId ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "participant_id,match_id" });

  if (error) {
    throw new Error(error.message);
  }
}
