import Link from "next/link";
import { Save } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { listDevResults } from "@/lib/dev-store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getTeamFlagUrl } from "@/lib/team-flags";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import { saveOfficialResults } from "./actions";

type ResultsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

type MatchRow = {
  id: string;
  matchNumber: number;
  date: string;
  time: string;
  group: string | null;
  teamA: string;
  teamB: string;
  teamAFlagUrl: string | null;
  teamBFlagUrl: string | null;
  stadium: string;
  city: string;
  officialScoreA: number | null;
  officialScoreB: number | null;
  status: "PENDING" | "FINISHED" | "CANCELLED";
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const matches = await getMatches();
  const grouped = groupByDate(matches);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              Resultados oficiais
            </p>
            <h1 className="text-3xl font-semibold">Controle das partidas</h1>
            <p className="mt-2 text-sm text-slate-600">
              {matches.length} jogos da fase de grupos.
            </p>
          </div>
          <Link
            href="/admin"
            className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Voltar
          </Link>
        </header>

        {params.saved ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {Number(params.saved) > 1
              ? `${params.saved} resultados salvos.`
              : "Resultado salvo."}
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <form action={saveOfficialResults} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Editar placares</h2>
              <p className="mt-1 text-sm text-slate-600">
                Preencha os jogos que terminaram e salve tudo de uma vez.
              </p>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
              <Save size={16} aria-hidden="true" />
              Salvar todos
            </button>
          </div>

          {Object.entries(grouped).map(([date, rows]) => (
            <section key={date} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold">
                  {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((match) => (
                  <div
                    key={match.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[80px_1fr_150px_150px_auto]"
                  >
                    <input type="hidden" name="matchId" value={match.id} />
                    <input
                      type="hidden"
                      name={`matchNumber-${match.id}`}
                      value={match.matchNumber}
                    />
                    <div className="text-sm text-slate-500">
                      <div>Jogo {match.matchNumber}</div>
                      <div>{match.time}</div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <Flag src={match.teamAFlagUrl} name={match.teamA} />
                        <span>{match.teamA}</span>
                        <span className="text-slate-400">x</span>
                        <Flag src={match.teamBFlagUrl} name={match.teamB} />
                        <span>{match.teamB}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Grupo {match.group ?? "-"} · {match.stadium} · {match.city}
                      </div>
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">{match.teamA}</span>
                      <input
                        name={`officialScoreA-${match.id}`}
                        type="number"
                        min={0}
                        defaultValue={match.officialScoreA ?? ""}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">{match.teamB}</span>
                      <input
                        name={`officialScoreB-${match.id}`}
                        type="number"
                        min={0}
                        defaultValue={match.officialScoreB ?? ""}
                        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <div className="flex items-end gap-3">
                      <span
                        className={
                          match.status === "FINISHED"
                            ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {match.status === "FINISHED" ? "Finalizado" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="flex justify-end">
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
              <Save size={16} aria-hidden="true" />
              Salvar todos
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

async function getMatches(): Promise<MatchRow[]> {
  if (!hasSupabaseEnv()) {
    const [fixtures, results] = await Promise.all([getGroupStageFixtures(), listDevResults()]);
    const resultByMatchNumber = new Map(results.map((result) => [result.matchNumber, result]));

    return fixtures.map((fixture) => {
      const result = resultByMatchNumber.get(fixture.matchNumber);
      return {
        id: String(fixture.matchNumber),
        matchNumber: fixture.matchNumber,
        date: fixture.date,
        time: new Date(fixture.kickoffUtc).toISOString().slice(11, 16),
        group: fixture.group,
        teamA: fixture.homeTeam,
        teamB: fixture.awayTeam,
        teamAFlagUrl: getTeamFlagUrl(fixture.homeTeam),
        teamBFlagUrl: getTeamFlagUrl(fixture.awayTeam),
        stadium: fixture.stadium,
        city: fixture.hostCity,
        officialScoreA: result?.officialScoreA ?? null,
        officialScoreB: result?.officialScoreB ?? null,
        status: result?.status ?? "PENDING",
      };
    });
  }

  const supabase = await createClient();
  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase.from("teams").select("id, name"),
    ]);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const teamById = new Map(teams.map((team) => [team.id, team.name]));

  return matches.map((match) => ({
    id: match.id,
    matchNumber: match.source_match_number ?? match.display_order,
    date: match.match_date,
    time: match.match_time?.slice(0, 5) ?? "--:--",
    group: match.group_name,
    teamA: teamById.get(match.team_a_id) ?? "Time A",
    teamB: teamById.get(match.team_b_id) ?? "Time B",
    teamAFlagUrl: getTeamFlagUrl(teamById.get(match.team_a_id) ?? ""),
    teamBFlagUrl: getTeamFlagUrl(teamById.get(match.team_b_id) ?? ""),
    stadium: match.stadium ?? "-",
    city: match.city ?? "-",
    officialScoreA: match.official_score_a,
    officialScoreB: match.official_score_b,
    status: match.status,
  }));
}

function Flag({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return <span className="inline-block size-5 rounded-sm bg-slate-200" aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Bandeira: ${name}`}
      className="h-4 w-6 rounded-[2px] border border-slate-200 object-cover"
    />
  );
}

function groupByDate(matches: MatchRow[]) {
  return matches.reduce<Record<string, MatchRow[]>>((acc, match) => {
    acc[match.date] ??= [];
    acc[match.date].push(match);
    return acc;
  }, {});
}
