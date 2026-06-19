import {
  CalendarDays,
  ClipboardCheck,
  Database,
  FileUp,
  ListChecks,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LoadingLink } from "./loading-link";

export default async function AdminPage() {
  const profile = await requireAdmin();
  const hasSupabaseEnv =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [{ count: teamsCount }, { count: matchesCount }] = hasSupabaseEnv
    ? await Promise.all([
        (await createClient()).from("teams").select("*", { count: "exact", head: true }),
        (await createClient()).from("matches").select("*", { count: "exact", head: true }),
      ])
    : [{ count: null }, { count: null }];

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Area administrativa
            </p>
            <h1 className="text-3xl font-semibold">Fundacao do bolao</h1>
            <p className="mt-2 text-sm text-slate-600">
              Logado como {profile.email}
            </p>
          </div>
          <LoadingLink
            href="/dashboard"
            loadingText="Abrindo..."
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </LoadingLink>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <LoadingLink
            href="/admin/participantes"
            loadingText="Abrindo participantes..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <Users className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Participantes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Criar, listar e preparar participantes para importacao.
            </p>
          </LoadingLink>
          <LoadingLink
            href="/admin/importacoes/nova"
            loadingText="Abrindo importacao..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <FileUp className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Importar arquivos</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enviar PDF, XLS ou XLSX associado a um participante.
            </p>
          </LoadingLink>
          <LoadingLink
            href="/admin/resultados"
            loadingText="Abrindo resultados..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <ListChecks className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Resultados oficiais</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ver partidas da fase de grupos e informar placares oficiais.
            </p>
          </LoadingLink>
          <LoadingLink
            href="/admin/palpites"
            loadingText="Abrindo palpites..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <ClipboardCheck className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Revisar palpites</h2>
            <p className="mt-2 text-sm text-slate-600">
              Conferir palpites aprovados, arquivo de origem e pontuacao por jogo.
            </p>
          </LoadingLink>
          <LoadingLink
            href="/admin/solicitacoes"
            loadingText="Abrindo solicitacoes..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <ClipboardCheck className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Solicitacoes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Aprovar ou rejeitar correcoes pedidas pelos participantes.
            </p>
          </LoadingLink>
          <LoadingLink
            href="/admin/configuracoes"
            loadingText="Abrindo config..."
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <Settings className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Configuracoes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Ativar ou desativar recursos publicos do bolao.
            </p>
          </LoadingLink>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Shield className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Roles</h2>
            <p className="mt-2 text-sm text-slate-600">
              ADMIN/PARTICIPANT ativos com validacao no app e RLS no banco.
            </p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Database className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Times</h2>
            <p className="mt-2 text-sm text-slate-600">
              {teamsCount ?? "Supabase pendente"} selecoes carregadas via seed.
            </p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <CalendarDays className="mb-4 text-emerald-700" size={24} aria-hidden="true" />
            <h2 className="font-semibold">Partidas</h2>
            <p className="mt-2 text-sm text-slate-600">
              {matchesCount ?? "Supabase pendente"} jogos cadastrados para a fase de grupos.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
