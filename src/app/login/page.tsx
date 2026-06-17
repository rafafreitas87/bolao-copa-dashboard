import { KeyRound } from "lucide-react";
import { signIn } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-lg border-2 border-slate-950 bg-white shadow-[12px_12px_0_#0f172a] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex min-h-[420px] items-end justify-center overflow-hidden bg-[#d71920] px-6 pt-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-[#f6d64a] border-b-2 border-slate-950" />
          <div className="absolute left-6 top-6 rounded-md border-2 border-slate-950 bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.2em]">
            Area secreta
          </div>
          <ChapolinFigure />
        </div>

        <div className="flex items-center bg-[#f6d64a] px-6 py-8 sm:px-10">
          <div className="w-full">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#d71920]">
              Nao contavam com minha astucia
            </p>
            <h1 className="mt-3 text-5xl font-black leading-none tracking-normal text-slate-950">
              QUAL é a senha?
            </h1>

            {params.error ? (
              <div className="mt-5 rounded-md border-2 border-slate-950 bg-[#fff3f3] px-3 py-2 text-sm font-bold text-[#b91c1c]">
                {params.error}
              </div>
            ) : null}

            <form action={signIn} className="mt-6 space-y-4">
              <input type="hidden" name="next" value={params.next ?? "/admin"} />
              <label className="block">
                <span className="text-sm font-black uppercase tracking-wide text-slate-900">
                  Senha
                </span>
                <div className="mt-2 flex items-center rounded-md border-2 border-slate-950 bg-white px-3">
                  <KeyRound size={20} aria-hidden="true" className="text-slate-700" />
                  <input
                    className="h-12 w-full bg-transparent px-3 font-semibold outline-none"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                  />
                </div>
              </label>
              <button className="h-12 w-full rounded-md border-2 border-slate-950 bg-[#1f7a3a] px-4 font-black uppercase tracking-wide text-white shadow-[4px_4px_0_#0f172a] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#0f172a]">
                Entrar admin
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function ChapolinFigure() {
  return (
    <div className="relative z-10 h-[520px] w-[420px] max-w-full">
      <svg viewBox="0 0 420 520" className="h-full w-full" aria-hidden="true">
        <path
          d="M168 112 151 38M252 112l17-74"
          stroke="#0f172a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle cx="149" cy="33" r="10" fill="#f6d64a" stroke="#0f172a" strokeWidth="5" />
        <circle cx="271" cy="33" r="10" fill="#f6d64a" stroke="#0f172a" strokeWidth="5" />
        <path
          d="M128 130c11-58 153-58 164 0l-18 74H146l-18-74Z"
          fill="#d71920"
          stroke="#0f172a"
          strokeWidth="6"
        />
        <circle cx="210" cy="153" r="70" fill="#f2c89c" stroke="#0f172a" strokeWidth="6" />
        <path d="M147 139c28-45 92-54 130-13-34-7-79-1-130 13Z" fill="#111827" />
        <circle cx="184" cy="158" r="6" fill="#0f172a" />
        <circle cx="236" cy="158" r="6" fill="#0f172a" />
        <path d="M194 189c13 8 27 8 40 0" stroke="#0f172a" strokeLinecap="round" strokeWidth="5" />
        <path
          d="M89 490c14-140 39-238 121-238s107 98 121 238H89Z"
          fill="#d71920"
          stroke="#0f172a"
          strokeWidth="7"
        />
        <path
          d="M151 296c-49 24-86 73-119 145M269 296c49 24 86 73 119 145"
          stroke="#d71920"
          strokeLinecap="round"
          strokeWidth="52"
        />
        <path
          d="M151 296c-49 24-86 73-119 145M269 296c49 24 86 73 119 145"
          stroke="#0f172a"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <path
          d="M105 489h210l-22-90H127l-22 90Z"
          fill="#b58b35"
          stroke="#0f172a"
          strokeWidth="7"
        />
        <path
          d="M154 357c9-44 103-44 112 0-9 43-103 43-112 0Z"
          fill="#f6d64a"
          stroke="#0f172a"
          strokeWidth="6"
        />
        <text
          x="210"
          y="374"
          textAnchor="middle"
          fontFamily="Arial Black, Arial, sans-serif"
          fontSize="44"
          fontWeight="900"
          fill="#d71920"
          stroke="#ffffff"
          strokeWidth="3"
          paintOrder="stroke"
        >
          CH
        </text>
      </svg>
    </div>
  );
}
