import Link from "next/link";
import {
  getDevPredictionsByParticipant,
  listDevParticipants,
  listDevResults,
} from "@/lib/dev-store";
import { calculatePredictionScore } from "@/lib/scoring";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";

type PublicParticipantPredictionsPageProps = {
  params: Promise<{
    participantId: string;
  }>;
};

export default async function PublicParticipantPredictionsPage({
  params,
}: PublicParticipantPredictionsPageProps) {
  const { participantId } = await params;

  const [participants, predictions, results, fixtures] = await Promise.all([
    listDevParticipants(),
    getDevPredictionsByParticipant(participantId),
    listDevResults(),
    getGroupStageFixtures(),
  ]);

  const participant = participants.find((row) => row.id === participantId);

  if (!participant) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Participante nao encontrado.
          </div>
        </div>
      </main>
    );
  }

  const predictionByMatchNumber = new Map(
    predictions.map((prediction) => [prediction.matchNumber, prediction]),
  );
  const resultByMatchNumber = new Map(results.map((result) => [result.matchNumber, result]));

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Palpites
            </p>
            <h1 className="text-3xl font-semibold">{participant.displayName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {predictionByMatchNumber.size}/{fixtures.length} palpites salvos.
            </p>
          </div>
          <Link
            href="/palpites"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </Link>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Todos os jogos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consulta somente leitura dos palpites aprovados.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Jogo</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Partida</th>
                  <th className="px-5 py-3 font-medium">Palpite</th>
                  <th className="px-5 py-3 font-medium">Oficial</th>
                  <th className="px-5 py-3 font-medium">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((fixture) => {
                  const prediction = predictionByMatchNumber.get(fixture.matchNumber);
                  const result = resultByMatchNumber.get(fixture.matchNumber);
                  const score =
                    prediction && result
                      ? calculatePredictionScore({
                          predictedScoreA: prediction.predictedScoreA,
                          predictedScoreB: prediction.predictedScoreB,
                          officialScoreA: result.officialScoreA,
                          officialScoreB: result.officialScoreB,
                        })
                      : null;

                  return (
                    <tr key={fixture.matchNumber} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium">{fixture.matchNumber}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(`${fixture.date}T12:00:00`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        {fixture.homeTeam} x {fixture.awayTeam}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {prediction
                          ? `${prediction.predictedScoreA} x ${prediction.predictedScoreB}`
                          : "Em falta"}
                      </td>
                      <td className="px-5 py-3">
                        {result ? `${result.officialScoreA} x ${result.officialScoreB}` : "Pendente"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            score?.exactScore
                              ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                              : score?.correctOutcome
                                ? "rounded-md bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700"
                                : score
                                  ? "rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                                  : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500"
                          }
                        >
                          {score ? score.points : "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
