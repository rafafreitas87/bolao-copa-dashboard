import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDevParticipants } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createParticipant } from "./actions";

type ParticipantsPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
};

export const runtime = "nodejs";

export default async function ParticipantsPage({ searchParams }: ParticipantsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const participants = await getParticipants();

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Participantes
            </p>
            <h1 className="text-3xl font-semibold">Criar e listar participantes</h1>
          </div>
          <Link
            href="/admin"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </Link>
        </header>

        {params.created ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Participante criado.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Novo participante</h2>
          <form action={createParticipant} className="grid gap-4 md:grid-cols-4">
            <label className="block md:col-span-1">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                name="name"
                required
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block md:col-span-1">
              <span className="text-sm font-medium text-slate-700">Nome exibido</span>
              <input
                name="displayName"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block md:col-span-1">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                name="email"
                type="email"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="flex items-end">
              <button className="h-10 w-full rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
                Criar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Participantes cadastrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Nome exibido</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{participant.name}</td>
                    <td className="px-5 py-3">{participant.displayName}</td>
                    <td className="px-5 py-3 text-slate-600">{participant.email ?? "-"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {participant.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={4}>
                      Nenhum participante cadastrado ainda.
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
    return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, display_name, email, active")
    .order("display_name");

  if (error) {
    throw new Error(error.message);
  }

  return data.map((participant) => ({
    id: participant.id,
    name: participant.name,
    displayName: participant.display_name,
    email: participant.email,
    active: participant.active,
  }));
}
