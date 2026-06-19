import { requireAdmin } from "@/lib/auth/session";
import { getBooleanConfig } from "@/lib/app-config";
import { SubmitButton } from "../submit-button";
import { saveAdminSettings } from "./actions";

type AdminSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const correctionRequestsEnabled = await getBooleanConfig("correction_requests_enabled", false);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Configuracoes
          </p>
          <h1 className="text-3xl font-semibold">Admin do bolao</h1>
        </header>

        {params.saved ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Configuracoes salvas.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <form action={saveAdminSettings} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="correctionRequestsEnabled"
              defaultChecked={correctionRequestsEnabled}
              className="mt-1 size-5 accent-emerald-700"
            />
            <span>
              <span className="block font-semibold">Enable solicitar revisao</span>
              <span className="mt-1 block text-sm text-slate-600">
                Quando ativo, participantes podem pedir correcao de um palpite na tela publica.
              </span>
            </span>
          </label>

          <div className="mt-6">
            <SubmitButton pendingText="Salvando...">Salvar configuracoes</SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}
