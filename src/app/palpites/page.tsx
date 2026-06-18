import Link from "next/link";
import {
  listDevParticipants,
  listDevPredictions,
  listDevResults,
} from "@/lib/dev-store";
import { buildRanking } from "@/lib/scoring";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  listSupabaseParticipants,
  listSupabasePredictions,
  listSupabaseResults,
} from "@/lib/supabase/read-model";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

export const dynamic = "force-dynamic";

export default async function PublicPredictionsPage() {
  const [participants, predictions, results, fixtures] = await getPublicPredictionInputs();

  const totalMatches = fixtures.length;
  const rankingByParticipantId = new Map(
    buildRanking(participants, predictions, results).map((row) => [row.participantId, row]),
  );
  const predictionsByParticipantId = new Map<string, Set<number>>();

  for (const prediction of predictions) {
    const set = predictionsByParticipantId.get(prediction.participantId) ?? new Set<number>();
    set.add(prediction.matchNumber);
    predictionsByParticipantId.set(prediction.participantId, set);
  }

  const rows = participants
    .filter((participant) => participant.active)
    .map((participant) => {
      const predictionCount = predictionsByParticipantId.get(participant.id)?.size ?? 0;

      return {
        participant,
        predictionCount,
        missingCount: Math.max(totalMatches - predictionCount, 0),
        ranking: rankingByParticipantId.get(participant.id),
      };
    })
    .sort((a, b) => {
      return (
        (b.ranking?.totalPoints ?? 0) - (a.ranking?.totalPoints ?? 0) ||
        (b.ranking?.exactScores ?? 0) - (a.ranking?.exactScores ?? 0) ||
        a.participant.displayName.localeCompare(b.participant.displayName)
      );
    });

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Consulta publica
            </p>
            <h1 className="text-3xl font-semibold">Palpites dos participantes</h1>
            <p className="mt-2 text-sm text-slate-600">
              Visualizacao publica sem edicao.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Admin
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Participantes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Clique em um participante para ver todos os jogos e palpites.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Pos</th>
                  <th className="px-5 py-3 font-medium">Participante</th>
                  <th className="px-5 py-3 font-medium">Palpites</th>
                  <th className="px-5 py-3 font-medium">Faltam</th>
                  <th className="px-5 py-3 font-medium">Cravados</th>
                  <th className="px-5 py-3 font-medium">Resultado certo</th>
                  <th className="px-5 py-3 font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ participant, predictionCount, missingCount, ranking }, index) => (
                  <tr key={participant.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-bold">{index + 1}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/palpites/${participant.id}`}
                        className="font-semibold text-emerald-800 hover:underline"
                      >
                        {participant.displayName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {predictionCount}/{totalMatches}
                    </td>
                    <td className="px-5 py-3">{missingCount}</td>
                    <td className="px-5 py-3">{ranking?.exactScores ?? 0}</td>
                    <td className="px-5 py-3">{ranking?.correctOutcomes ?? 0}</td>
                    <td className="px-5 py-3 text-lg font-bold">{ranking?.totalPoints ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

async function getPublicPredictionInputs() {
  if (hasSupabaseEnv()) {
    try {
      return await Promise.all([
        listSupabaseParticipants(),
        listSupabasePredictions(),
        listSupabaseResults(),
        getGroupStageFixtures(),
      ]);
    } catch (error) {
      console.error("Could not load Supabase predictions data, falling back to seed data.", error);
    }
  }

  return Promise.all([
    listDevParticipants(),
    listDevPredictions(),
    listDevResults(),
    getGroupStageFixtures(),
  ]);
}
