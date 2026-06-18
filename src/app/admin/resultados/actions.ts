"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { saveDevResult } from "@/lib/dev-store";
import {
  fetchEspnOfficialResults,
  teamNameMatches,
} from "@/lib/official-results-source";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function applyEspnOfficialResults() {
  await requireAdmin();

  if (!hasSupabaseEnv()) {
    redirect("/admin/resultados?error=Sincronizacao%20externa%20disponivel%20so%20em%20producao");
  }

  let applied = 0;

  try {
  const externalResults = await fetchEspnOfficialResults();
  const supabase = createAdminClient();
  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, source_match_number, team_a_id, team_b_id")
        .not("source_match_number", "is", null),
      supabase.from("teams").select("id, name, name_en, aliases"),
    ]);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));

  for (const external of externalResults) {
    const match = matches.find((candidate) => {
      const home = teamById.get(candidate.team_a_id);
      const away = teamById.get(candidate.team_b_id);

      if (!home || !away) {
        return false;
      }

      return (
        teamNameMatches(external.teamA, {
          name: home.name,
          nameEn: home.name_en,
          aliases: home.aliases,
        }) &&
        teamNameMatches(external.teamB, {
          name: away.name,
          nameEn: away.name_en,
          aliases: away.aliases,
        })
      );
    });

    if (!match) {
      continue;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        official_score_a: external.officialScoreA,
        official_score_b: external.officialScoreB,
        status: "FINISHED",
      })
      .eq("id", match.id);

    if (error) {
      throw new Error(error.message);
    }

    applied += 1;
  }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar ESPN";
    redirect(`/admin/resultados?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/resultados?externalSynced=${applied}`);
}
