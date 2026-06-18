import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import {
  listDevParticipants,
  listDevPredictions,
  listDevResults,
  listDevUploads,
} from "@/lib/dev-store";
import { buildRanking } from "@/lib/scoring";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  listSupabaseParticipants,
  listSupabasePredictions,
  listSupabaseResults,
} from "@/lib/supabase/read-model";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import { resetAllPredictions } from "./actions";

type AdminPredictionsPageProps = {
  searchParams: Promise<{
    reset?: string;
    error?: string;
  }>;
};

export default async function AdminPredictionsPage({ searchParams }: AdminPredictionsPageProps) {
  await requireAdmin();
  const search = await searchParams;

  const [participants, predictions, results, uploads, fixtures] = hasSupabaseEnv()
    ? await Promise.all([
        listSupabaseParticipants(),
        listSupabasePredictions(),
        listSupabaseResults(),
        listSupabaseUploads(),
        getGroupStageFixtures(),
      ])
    : await Promise.all([
        listDevParticipants(),
        listDevPredictions(),
        listDevResults(),
        listDevUploads(),
        getGroupStageFixtures(),
      ]);

  const totalMatches = fixtures.length;
  const rankingByParticipantId = new Map(
    buildRanking(participants, predictions, results).map((row) => [row.participantId, row]),
  );
  const predictionsByParticipantId = new Map<string, Set<number>>();
  const latestUploadByParticipantId = new Map<string, (typeof uploads)[number]>();

  for (const prediction of predictions) {
    const set = predictionsByParticipantId.get(prediction.participantId) ?? new Set<number>();
    set.add(prediction.matchNumber);
    predictionsByParticipantId.set(prediction.participantId, set);
  }

  for (const upload of uploads.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))) {
    if (!latestUploadByParticipantId.has(upload.participantId)) {
      latestUploadByParticipantId.set(upload.participantId, upload);
    }
  }

  const rows = participants
    .filter((participant) => participant.active)
    .map((participant) => {
      const uniquePredictionCount = predictionsByParticipantId.get(participant.id)?.size ?? 0;
      const ranking = rankingByParticipantId.get(participant.id);
      const latestUpload = latestUploadByParticipantId.get(participant.id);

      return {
        participant,
        predictionCount: uniquePredictionCount,
        missingCount: Math.max(totalMatches - uniquePredictionCount, 0),
        ranking,
        latestUpload,
      };
    })
    .sort((a, b) => {
      return (
        a.missingCount - b.missingCount ||
        b.predictionCount - a.predictionCount ||
        a.participant.displayName.localeCompare(b.participant.displayName)
      );
    });

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Revisao de palpites
            </p>
            <h1 className="text-3xl font-semibold">Controle por participante</h1>
            <p className="mt-2 text-sm text-slate-600">
              {participants.length} participantes · {predictions.length} palpites salvos ·{" "}
              {results.length} resultados oficiais.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/importacoes/nova"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Importar arquivo
            </Link>
            <Link
              href="/admin"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>
        </header>

        {search.reset ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Todos os palpites foram apagados. Agora voce pode reimportar os arquivos.
          </div>
        ) : null}
        {search.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {search.error}
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Resetar palpites</h2>
              <p className="mt-1 text-sm text-slate-600">
                Apaga todos os palpites salvos, mantendo participantes, uploads e resultados
                oficiais.
              </p>
            </div>
            <form action={resetAllPredictions}>
              <button className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800">
                Resetar todos
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Participantes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Participante</th>
                  <th className="px-5 py-3 font-medium">Palpites</th>
                  <th className="px-5 py-3 font-medium">Faltam</th>
                  <th className="px-5 py-3 font-medium">Pontuados</th>
                  <th className="px-5 py-3 font-medium">Cravados</th>
                  <th className="px-5 py-3 font-medium">Resultado certo</th>
                  <th className="px-5 py-3 font-medium">Pontos</th>
                  <th className="px-5 py-3 font-medium">Ultimo arquivo</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ participant, predictionCount, missingCount, ranking, latestUpload }) => (
                  <tr key={participant.id} className="border-t border-slate-100">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/palpites/${participant.id}`}
                        className="font-semibold text-emerald-800 hover:underline"
                      >
                        {participant.displayName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {predictionCount}/{totalMatches}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          missingCount === 0
                            ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                            : "rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800"
                        }
                      >
                        {missingCount}
                      </span>
                    </td>
                    <td className="px-5 py-3">{ranking?.scoredPredictions ?? 0}</td>
                    <td className="px-5 py-3">{ranking?.exactScores ?? 0}</td>
                    <td className="px-5 py-3">{ranking?.correctOutcomes ?? 0}</td>
                    <td className="px-5 py-3 text-lg font-bold">{ranking?.totalPoints ?? 0}</td>
                    <td className="max-w-64 truncate px-5 py-3 text-slate-600">
                      {latestUpload ? latestUpload.fileName : "Nenhum"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/palpites/${participant.id}`}
                          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                        >
                          Revisar
                        </Link>
                        <Link
                          href={`/admin/importacoes/nova?participantId=${participant.id}`}
                          className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                        >
                          Importar
                        </Link>
                      </div>
                    </td>
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
