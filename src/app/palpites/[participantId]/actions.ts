"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getBooleanConfig } from "@/lib/app-config";

export async function requestPredictionCorrection(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const matchNumber = Number(String(formData.get("matchNumber") ?? ""));
  const requestedScoreA = Number(String(formData.get("requestedScoreA") ?? ""));
  const requestedScoreB = Number(String(formData.get("requestedScoreB") ?? ""));
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!participantId || !Number.isInteger(matchNumber)) {
    redirect("/palpites?error=Solicitacao%20invalida");
  }

  const enabled = await getBooleanConfig("correction_requests_enabled", false);

  if (!enabled) {
    redirect(`/palpites/${participantId}?error=Solicitacoes%20de%20revisao%20estao%20desativadas`);
  }

  if (!hasSupabaseEnv()) {
    redirect(`/palpites/${participantId}?error=Solicitacoes%20precisam%20do%20Supabase`);
  }

  if (
    !Number.isInteger(requestedScoreA) ||
    !Number.isInteger(requestedScoreB) ||
    requestedScoreA < 0 ||
    requestedScoreB < 0
  ) {
    redirect(`/palpites/${participantId}?error=Informe%20um%20placar%20valido`);
  }

  const supabase = createAdminClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("source_match_number", matchNumber)
    .maybeSingle();

  if (matchError || !match) {
    redirect(`/palpites/${participantId}?error=Jogo%20nao%20encontrado`);
  }

  const { data: prediction, error: predictionError } = await supabase
    .from("predictions")
    .select("id, predicted_score_a, predicted_score_b")
    .eq("participant_id", participantId)
    .eq("match_id", match.id)
    .maybeSingle();

  if (predictionError) {
    redirect(`/palpites/${participantId}?error=${encodeURIComponent(predictionError.message)}`);
  }

  const { error } = await supabase.from("prediction_correction_requests").insert({
    participant_id: participantId,
    prediction_id: prediction?.id ?? null,
    match_id: match.id,
    current_score_a: prediction?.predicted_score_a ?? null,
    current_score_b: prediction?.predicted_score_b ?? null,
    requested_score_a: requestedScoreA,
    requested_score_b: requestedScoreB,
    requester_name: requesterName || null,
    note: note || null,
    status: "PENDING",
  });

  if (error) {
    redirect(`/palpites/${participantId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/palpites/${participantId}?revisionRequested=1`);
}
