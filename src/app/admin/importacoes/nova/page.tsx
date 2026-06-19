import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDevParticipants, listDevUploads } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LoadingLink } from "../../loading-link";
import { SubmitButton } from "../../submit-button";
import { uploadPredictionFile } from "./actions";

type NewImportPageProps = {
  searchParams: Promise<{
    uploaded?: string;
    error?: string;
    participantId?: string;
  }>;
};

export const runtime = "nodejs";

export default async function NewImportPage({ searchParams }: NewImportPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const participants = await getParticipants();
  const uploads = await getUploads(participants);
  const selectedParticipant = participants.find((participant) => participant.id === params.participantId);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Importacoes
            </p>
            <h1 className="text-3xl font-semibold">Upload de PDF, planilha ou foto</h1>
          </div>
          <Link
            href="/admin"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </Link>
        </header>

        {params.uploaded ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Arquivo enviado.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Novo upload</h2>
            {selectedParticipant ? (
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                Participante: {selectedParticipant.displayName}
              </span>
            ) : null}
          </div>
          <form action={uploadPredictionFile} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Participante</span>
              <select
                name="participantId"
                required
                defaultValue={params.participantId ?? ""}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Selecione</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Arquivo</span>
              <input
                name="file"
                type="file"
                accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
                required
                className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white text-sm file:mr-3 file:h-10 file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-medium"
              />
            </label>
            <div className="flex items-end">
              <SubmitButton pendingText="Enviando...">
                Enviar
              </SubmitButton>
            </div>
          </form>
          {participants.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Cadastre pelo menos um participante antes de importar arquivos.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Uploads recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Arquivo</th>
                  <th className="px-5 py-3 font-medium">Participante</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{upload.fileName}</td>
                    <td className="px-5 py-3">{upload.participantName}</td>
                    <td className="px-5 py-3">{upload.fileType}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(upload.uploadedAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <LoadingLink
                        href={`/admin/importacoes/${upload.id}/revisar`}
                        loadingText="Abrindo..."
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                      >
                        Revisar
                      </LoadingLink>
                    </td>
                  </tr>
                ))}
                {uploads.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                      Nenhum upload feito ainda.
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

async function getParticipants() {
  if (!hasSupabaseEnv()) {
    const rows = await listDevParticipants();
    return rows
      .map((participant) => ({
        id: participant.id,
        displayName: participant.displayName,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name")
    .eq("active", true)
    .order("display_name");

  if (error) {
    throw new Error(error.message);
  }

  return data.map((participant) => ({
    id: participant.id,
    displayName: participant.display_name,
  }));
}

async function getUploads(participants: Array<{ id: string; displayName: string }>) {
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant.displayName]),
  );

  if (!hasSupabaseEnv()) {
    const rows = await listDevUploads();
    return rows
      .map((upload) => ({
        id: upload.id,
        fileName: upload.fileName,
        participantName: participantById.get(upload.participantId) ?? "Participante nao encontrado",
        fileType: upload.fileType,
        status: upload.status,
        uploadedAt: upload.uploadedAt,
      }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, participant_id, file_name, file_type, status, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data.map((upload) => ({
    id: upload.id,
    fileName: upload.file_name,
    participantName: participantById.get(upload.participant_id) ?? "Participante nao encontrado",
    fileType: upload.file_type,
    status: upload.status,
    uploadedAt: upload.uploaded_at,
  }));
}
