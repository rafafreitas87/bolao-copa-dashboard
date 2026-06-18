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
