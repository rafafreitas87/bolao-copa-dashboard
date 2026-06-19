"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveCorrectionRequest(formData: FormData) {
  const profile = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");

  if (!requestId) {
    redirect("/admin/solicitacoes?error=Solicitacao%20invalida");
  }

  const supabase = createAdminClient();
  const { data: request, error: requestError } = await supabase
    .from("prediction_correction_requests")
    .select("id, participant_id, prediction_id, match_id, requested_score_a, requested_score_b, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request || request.status !== "PENDING") {
    redirect("/admin/solicitacoes?error=Solicitacao%20nao%20esta%20pendente");
  }

  const predictionMutation = request.prediction_id
    ? supabase
        .from("predictions")
        .update({
          predicted_score_a: request.requested_score_a,
          predicted_score_b: request.requested_score_b,
          source_file_name: "Solicitacao de revisao aprovada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.prediction_id)
    : supabase.from("predictions").insert({
        participant_id: request.participant_id,
        match_id: request.match_id,
        predicted_score_a: request.requested_score_a,
        predicted_score_b: request.requested_score_b,
        source_file_name: "Solicitacao de revisao aprovada",
      });

  const { error: predictionError } = await predictionMutation;

  if (predictionError) {
    redirect(`/admin/solicitacoes?error=${encodeURIComponent(predictionError.message)}`);
  }

  const { error } = await supabase
    .from("prediction_correction_requests")
    .update({
      status: "APPROVED",
      reviewed_by_user_id: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) {
    redirect(`/admin/solicitacoes?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/solicitacoes?approved=1");
}

export async function rejectCorrectionRequest(formData: FormData) {
  const profile = await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  if (!requestId) {
    redirect("/admin/solicitacoes?error=Solicitacao%20invalida");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("prediction_correction_requests")
    .update({
      status: "REJECTED",
      reviewed_by_user_id: profile.id,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "PENDING");

  if (error) {
    redirect(`/admin/solicitacoes?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/solicitacoes?rejected=1");
}
