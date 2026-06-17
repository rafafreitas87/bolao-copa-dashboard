import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import {
  listDevParticipants,
  listDevPredictions,
  listDevResults,
} from "@/lib/dev-store";
import { buildRanking } from "@/lib/scoring";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import { RaceStage } from "./race-stage";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const leader = dashboard.ranking[0];

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold">Bolao Copa 2026</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/palpites"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ver palpites
            </Link>
            <Link
              href="/admin"
              className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Admin
            </Link>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Trophy className="mb-3 text-emerald-700" size={24} aria-hidden="true" />
            <p className="text-sm text-slate-500">Lider atual</p>
            <p className="mt-1 text-xl font-bold">{leader?.participantName ?? "-"}</p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Medal className="mb-3 text-emerald-700" size={24} aria-hidden="true" />
            <p className="text-sm text-slate-500">Pontos do lider</p>
            <p className="mt-1 text-xl font-bold">{leader?.totalPoints ?? 0}</p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Jogos finalizados</p>
            <p className="mt-1 text-xl font-bold">{dashboard.finishedMatches}</p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Participantes com palpites</p>
            <p className="mt-1 text-xl font-bold">{dashboard.participantsWithPredictions}</p>
          </section>
        </div>

        <RaceStage days={dashboard.raceDays} />

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Ranking geral</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pontuacao calculada com os resultados oficiais ja informados.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Pos</th>
                  <th className="px-5 py-3 font-medium">Participante</th>
                  <th className="px-5 py-3 font-medium">Pontos</th>
                  <th className="px-5 py-3 font-medium">Cravados</th>
                  <th className="px-5 py-3 font-medium">Resultado certo</th>
                  <th className="px-5 py-3 font-medium">Erros</th>
                  <th className="px-5 py-3 font-medium">Palpites</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.ranking.map((row, index) => (
                  <tr key={row.participantId} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-bold">{index + 1}</td>
                    <td className="px-5 py-3 font-semibold">{row.participantName}</td>
                    <td className="px-5 py-3 text-lg font-bold">{row.totalPoints}</td>
                    <td className="px-5 py-3">{row.exactScores}</td>
                    <td className="px-5 py-3">{row.correctOutcomes}</td>
                    <td className="px-5 py-3">{row.wrongPredictions}</td>
                    <td className="px-5 py-3">
                      {row.scoredPredictions}/{row.totalPredictions}
                    </td>
                  </tr>
                ))}
                {dashboard.ranking.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={7}>
                      Nenhum palpite aprovado ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

async function getDashboardData() {
  if (hasSupabaseEnv()) {
    return {
      ranking: [],
      raceDays: [],
      finishedMatches: 0,
      participantsWithPredictions: 0,
    };
  }

  const [participants, predictions, results, fixtures] = await Promise.all([
    listDevParticipants(),
    listDevPredictions(),
    listDevResults(),
    getGroupStageFixtures(),
  ]);
  const fixtureByMatchNumber = new Map(fixtures.map((fixture) => [fixture.matchNumber, fixture]));
  const ranking = buildRanking(participants, predictions, results).filter(
    (row) => row.totalPredictions > 0 || row.totalPoints > 0,
  );
  const resultDays = [
    ...new Set(
      results
        .map((result) => fixtureByMatchNumber.get(result.matchNumber)?.date)
        .filter((date): date is string => Boolean(date)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const raceDays = resultDays.map((date) => {
    const dayResults = results.filter((result) => {
      const fixture = fixtureByMatchNumber.get(result.matchNumber);

      return fixture ? fixture.date <= date : false;
    });
    const dayRanking = buildRanking(participants, predictions, dayResults).filter(
      (row) => row.totalPredictions > 0 || row.totalPoints > 0,
    );
    const topRows = dayRanking.slice(0, 8);

    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      leader: topRows[0] ?? null,
      topRows,
      maxPoints: Math.max(...topRows.map((row) => row.totalPoints), 0),
    };
  });

  return {
    ranking,
    raceDays,
    finishedMatches: results.length,
    participantsWithPredictions: new Set(predictions.map((prediction) => prediction.participantId))
      .size,
  };
}
