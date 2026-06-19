import { LoadingLink } from "./loading-link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 text-slate-950 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <LoadingLink href="/dashboard" loadingText="Abrindo..." className="text-sm font-black tracking-wide">
            Bolao Copa 2026
          </LoadingLink>
          <div className="flex flex-wrap gap-2">
            <LoadingLink
              href="/dashboard"
              loadingText="Abrindo..."
              className="h-9 rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Dashboard
            </LoadingLink>
            <LoadingLink
              href="/admin"
              loadingText="Abrindo..."
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Admin
            </LoadingLink>
            <LoadingLink
              href="/admin/palpites"
              loadingText="Abrindo..."
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Palpites
            </LoadingLink>
            <LoadingLink
              href="/admin/resultados"
              loadingText="Abrindo..."
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Resultados
            </LoadingLink>
            <LoadingLink
              href="/admin/solicitacoes"
              loadingText="Abrindo..."
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Solicitacoes
            </LoadingLink>
            <LoadingLink
              href="/admin/configuracoes"
              loadingText="Abrindo..."
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Config
            </LoadingLink>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
