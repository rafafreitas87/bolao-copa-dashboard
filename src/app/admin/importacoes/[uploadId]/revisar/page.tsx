import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import {
  getDevUpload,
  getDevPredictionsByUpload,
  listDevParticipants,
  readDevUploadBytes,
} from "@/lib/dev-store";
import { parseUploadPreview } from "@/lib/import/parse-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  listSupabaseParticipants,
  listSupabasePredictionsByUpload,
} from "@/lib/supabase/read-model";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import { approveDetectedPredictions, saveManualPredictions } from "./actions";

type ReviewImportPageProps = {
  params: Promise<{
    uploadId: string;
  }>;
  searchParams: Promise<{
    approved?: string;
    error?: string;
  }>;
};

export const runtime = "nodejs";

export default async function ReviewImportPage({ params, searchParams }: ReviewImportPageProps) {
  await requireAdmin();
  const { uploadId } = await params;
  const search = await searchParams;

  const [upload, participants, savedPredictions] = hasSupabaseEnv()
    ? await getSupabaseReviewData(uploadId)
    : await Promise.all([
        getDevUpload(uploadId),
        listDevParticipants(),
        getDevPredictionsByUpload(uploadId),
      ]);

  if (!upload) {
    return (
      <ReviewShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Upload nao encontrado.
        </div>
      </ReviewShell>
    );
  }

  const participant = participants.find((row) => row.id === upload.participantId);
  const fixtures = await getGroupStageFixtures();
  let preview: Awaited<ReturnType<typeof parseUploadPreview>> | null = null;
  let previewError: string | null = null;

  try {
    const bytes = hasSupabaseEnv()
      ? await readSupabaseUploadBytes(upload.storagePath)
      : await readDevUploadBytes(upload);
    preview = await parseUploadPreview(upload, bytes);
  } catch (error) {
    previewError =
      error instanceof Error
        ? error.message
        : "Nao foi possivel abrir o arquivo enviado.";
  }

  if (!preview) {
    return (
      <ReviewShell>
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <Info label="Participante" value={participant?.displayName ?? "Nao encontrado"} />
            <Info label="Arquivo" value={upload.fileName} />
            <Info label="Tipo" value={upload.fileType} />
            <Info label="Status" value={upload.status} />
          </div>
        </section>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Nao foi possivel carregar o arquivo para revisao neste ambiente. No deploy sem Supabase,
          uploads ficam em armazenamento temporario da Vercel e podem sumir entre requisicoes.
          Erro: {previewError ?? "arquivo indisponivel"}.
        </div>
      </ReviewShell>
    );
  }

  const detectedPredictions =
    preview.kind === "pdf" || preview.kind === "excel" ? preview.detectedPredictions : [];
  const isScannedPdf =
    preview.kind === "pdf" && detectedPredictions.length === 0 && preview.lines.length === 0;
  const savedPredictionByMatchNumber = new Map(
    savedPredictions.map((prediction) => [prediction.matchNumber, prediction]),
  );
  const pdfOriginalSection =
    preview.kind === "pdf" ? (
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Arquivo original</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use esta visualizacao para conferir PDFs escaneados ou preenchidos a mao.
              </p>
            </div>
            <a
              href={`/admin/importacoes/${upload.id}/arquivo`}
              target="_blank"
              rel="noreferrer"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Abrir PDF
            </a>
          </div>
        </div>
        <iframe
          src={`/admin/importacoes/${upload.id}/arquivo`}
          title={`Arquivo ${upload.fileName}`}
          className="h-[620px] w-full rounded-b-lg bg-slate-100"
        />
      </section>
    ) : null;
  const manualPredictionSection =
    preview.kind === "pdf" ? (
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Digitacao manual assistida</h2>
              <p className="mt-1 text-sm text-slate-600">
                Para PDF escaneado, preencha os placares olhando o arquivo. Campos ja salvos ficam
                preenchidos.
              </p>
            </div>
          </div>
        </div>
        <form action={saveManualPredictions}>
          <input type="hidden" name="uploadId" value={upload.id} />
          <div className="max-h-[720px] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Jogo</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Partida</th>
                  <th className="px-5 py-3 font-medium">Palpite</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((fixture) => {
                  const savedPrediction = savedPredictionByMatchNumber.get(fixture.matchNumber);

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
                            defaultValue={savedPrediction?.predictedScoreA ?? ""}
                            className="h-9 w-16 rounded-md border border-slate-300 px-2 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                          />
                          <span className="font-semibold text-slate-400">x</span>
                          <input
                            name={`scoreB_${fixture.matchNumber}`}
                            type="number"
                            min={0}
                            defaultValue={savedPrediction?.predictedScoreB ?? ""}
                            className="h-9 w-16 rounded-md border border-slate-300 px-2 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-5 py-4">
            <button className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
              Salvar palpites digitados
            </button>
          </div>
        </form>
      </section>
    ) : null;

  return (
    <ReviewShell>
      {search.approved ? (
        <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Palpites aprovados e salvos para este participante.
        </div>
      ) : null}
      {search.error ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {search.error}
        </div>
      ) : null}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <Info label="Participante" value={participant?.displayName ?? "Nao encontrado"} />
          <Info label="Arquivo" value={upload.fileName} />
          <Info label="Tipo" value={upload.fileType} />
          <Info
            label="Status"
            value={savedPredictions.length > 0 ? `APROVADO (${savedPredictions.length})` : upload.status}
          />
        </div>
      </section>

      {preview.kind === "excel" ? (
        <div className="space-y-6">
          {preview.sheets.map((sheet) => (
            <section key={sheet.name} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold">Aba: {sheet.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Previa das primeiras linhas da planilha importada.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <tbody>
                    {sheet.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-slate-100">
                        <td className="w-14 bg-slate-50 px-3 py-2 text-slate-500">{rowIndex + 1}</td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="max-w-60 px-3 py-2">
                            {String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {preview.kind === "pdf" || preview.kind === "excel" ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Palpites detectados</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {detectedPredictions.length} linhas reconhecidas no arquivo.
                </p>
              </div>
              <form action={approveDetectedPredictions}>
                <input type="hidden" name="uploadId" value={upload.id} />
                <button
                  className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={detectedPredictions.length === 0}
                >
                  {savedPredictions.length > 0
                    ? "Reaprovar palpites"
                    : `Aprovar ${detectedPredictions.length} palpites`}
                </button>
              </form>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Jogo</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Time A</th>
                  <th className="px-5 py-3 font-medium">Palpite</th>
                  <th className="px-5 py-3 font-medium">Time B</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {detectedPredictions.map((row) => (
                  <tr key={row.matchNumber} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{row.matchNumber}</td>
                    <td className="px-5 py-3">{row.dateLabel}</td>
                    <td className="px-5 py-3">{row.teamA}</td>
                    <td className="px-5 py-3 font-semibold">
                      {row.predictedScoreA} x {row.predictedScoreB}
                    </td>
                    <td className="px-5 py-3">{row.teamB}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        Detectado
                      </span>
                    </td>
                  </tr>
                ))}
                {detectedPredictions.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                      Nenhum palpite reconhecido automaticamente.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {preview.kind === "pdf" ? (
        <div className="mt-6 space-y-6">
          {isScannedPdf ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Este PDF parece ser escaneado ou preenchido a mao. O sistema nao consegue ler os
              placares automaticamente nesse formato, entao use a digitacao manual abaixo.
            </div>
          ) : null}
          {isScannedPdf ? manualPredictionSection : pdfOriginalSection}
          {isScannedPdf ? pdfOriginalSection : manualPredictionSection}

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold">Texto extraido do PDF</h2>
              <p className="mt-1 text-sm text-slate-600">
                {preview.errorMessage
                  ? `Erro na extracao: ${preview.errorMessage}`
                  : preview.lines.length > 0
                    ? "Linhas encontradas para revisao."
                    : "Nao foi encontrado texto extraivel. Pode ser um PDF escaneado."}
              </p>
            </div>
          <div className="max-h-[520px] overflow-auto p-5">
            {preview.lines.length > 0 ? (
              <ol className="space-y-2 text-sm">
                {preview.lines.map((line, index) => (
                  <li key={`${index}-${line}`} className="grid grid-cols-[48px_1fr] gap-3">
                    <span className="text-right text-slate-400">{index + 1}</span>
                    <span className="rounded-md bg-slate-50 px-3 py-2">{line}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
                Este PDF parece nao ter texto pesquisavel. Vamos precisar de OCR ou digitacao manual
                assistida na proxima etapa.
              </div>
            )}
          </div>
          </section>
        </div>
      ) : null}

      {preview.kind === "unsupported" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {preview.message}
        </div>
      ) : null}
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Revisao de importacao
            </p>
            <h1 className="text-3xl font-semibold">Conferir arquivo enviado</h1>
          </div>
          <Link
            href="/admin/importacoes/nova"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

async function getSupabaseReviewData(uploadId: string) {
  const supabase = createAdminClient();
  const [{ data: upload, error: uploadError }, participants, savedPredictions] =
    await Promise.all([
      supabase
        .from("uploads")
        .select("id, participant_id, file_name, file_type, storage_path, uploaded_at, status")
        .eq("id", uploadId)
        .maybeSingle(),
      listSupabaseParticipants(),
      listSupabasePredictionsByUpload(uploadId),
    ]);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return [
    upload
      ? {
          id: upload.id,
          participantId: upload.participant_id,
          fileName: upload.file_name,
          fileType: upload.file_type,
          storagePath: upload.storage_path,
          uploadedAt: upload.uploaded_at,
          status: "UPLOADED" as const,
        }
      : null,
    participants,
    savedPredictions,
  ] as const;
}

async function readSupabaseUploadBytes(storagePath: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("bolao-uploads").download(storagePath);

  if (error) {
    throw new Error(error.message);
  }

  return Buffer.from(await data.arrayBuffer());
}
