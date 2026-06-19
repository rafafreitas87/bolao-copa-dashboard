import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import {
  getDevPredictionsByParticipant,
  listDevParticipants,
  listDevResults,
  listDevUploads,
} from "@/lib/dev-store";
import { calculatePredictionScore } from "@/lib/scoring";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  listSupabaseParticipants,
  listSupabasePredictionsByParticipant,
  listSupabaseResults,
} from "@/lib/supabase/read-model";
import { getSpreadsheetOrderedFixtures } from "@/lib/fixture-order";
import { LoadingLink } from "../../loading-link";
import { SubmitButton } from "../../submit-button";
import { saveParticipantPredictions } from "./actions";

type ParticipantPredictionsPageProps = {
  params: Promise<{
    participantId: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function ParticipantPredictionsPage({
  params,
  searchParams,
}: ParticipantPredictionsPageProps) {
  await requireAdmin();
  const { participantId } = await params;
  const search = await searchParams;

  const [participants, predictions, results, fixtures, uploads] = hasSupabaseEnv()
    ? await Promise.all([
        listSupabaseParticipants(),
        listSupabasePredictionsByParticipant(participantId),
        listSupabaseResults(),
        getSpreadsheetOrderedFixtures(),
        listSupabaseUploads(),
      ])
    : await Promise.all([
        listDevParticipants(),
        getDevPredictionsByParticipant(participantId),
        listDevResults(),
        getSpreadsheetOrderedFixtures(),
        listDevUploads(),
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
  const participantUploads = uploads
    .filter((upload) => upload.participantId === participantId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const missingCount = Math.max(fixtures.length - predictionByMatchNumber.size, 0);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Revisao individual
            </p>
            <h1 className="text-3xl font-semibold">{participant.displayName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {predictionByMatchNumber.size}/{fixtures.length} palpites salvos · {missingCount} em
              falta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingLink
              href={`/admin/importacoes/nova?participantId=${participant.id}`}
              loadingText="Abrindo importacao..."
              className="h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Importar arquivo
            </LoadingLink>
            <Link
              href="/admin/palpites"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>
        </header>

        {search.saved ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Palpites salvos para este participante.
          </div>
        ) : null}
        {search.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {search.error}
          </div>
        ) : null}

        {participantUploads.length > 0 ? (
          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Arquivos importados</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {participantUploads.map((upload) => (
                <LoadingLink
                  key={upload.id}
                  href={`/admin/importacoes/${upload.id}/revisar`}
                  loadingText="Abrindo..."
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  {upload.fileName}
                </LoadingLink>
              ))}
            </div>
          </section>
        ) : null}

        <form action={saveParticipantPredictions}>
          <input type="hidden" name="participantId" value={participant.id} />
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Todos os jogos</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Edite os placares do participante e salve a grade completa.
                </p>
              </div>
              <SubmitButton pendingText="Salvando...">
                Salvar palpites
              </SubmitButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Jogo</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Partida</th>
                    <th className="px-5 py-3 font-medium">Palpite</th>
                    <th className="px-5 py-3 font-medium">Oficial</th>
                    <th className="px-5 py-3 font-medium">Pontos</th>
                    <th className="px-5 py-3 font-medium">Fonte</th>
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
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              name={`scoreA_${fixture.matchNumber}`}
                              type="number"
                              min={0}
                              defaultValue={prediction?.predictedScoreA ?? ""}
                              className="h-9 w-16 rounded-md border border-slate-300 px-2 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            />
                            <span className="font-semibold text-slate-400">x</span>
                            <input
                              name={`scoreB_${fixture.matchNumber}`}
                              type="number"
                              min={0}
                              defaultValue={prediction?.predictedScoreB ?? ""}
                              className="h-9 w-16 rounded-md border border-slate-300 px-2 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            />
                          </div>
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
                        <td className="max-w-52 truncate px-5 py-3 text-slate-500">
                          {prediction?.sourceFileName ?? "Em falta"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <SubmitButton pendingText="Salvando...">
                Salvar palpites
              </SubmitButton>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

async function listSupabaseUploads() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, participant_id, file_name, file_type, storage_path, uploaded_at, status")
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map((upload) => ({
    id: upload.id,
    participantId: upload.participant_id,
    fileName: upload.file_name,
    fileType: upload.file_type,
    storagePath: upload.storage_path,
    uploadedAt: upload.uploaded_at,
    status: "UPLOADED" as const,
  }));
}
