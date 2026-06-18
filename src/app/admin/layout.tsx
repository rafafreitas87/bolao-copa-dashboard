import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 text-slate-950 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm font-black tracking-wide">
            Bolao Copa 2026
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="h-9 rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Admin
            </Link>
            <Link
              href="/admin/palpites"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Palpites
            </Link>
            <Link
              href="/admin/resultados"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
            >
              Resultados
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
