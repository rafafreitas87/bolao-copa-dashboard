import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listDevResults } from "@/lib/dev-store";
import {
  fetchEspnOfficialResults,
  teamNameMatches,
} from "@/lib/official-results-source";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getTeamFlagUrl } from "@/lib/team-flags";
import { getGroupStageFixtures } from "@/lib/world-cup-fixtures";
import { SubmitButton } from "../submit-button";
import { applyEspnOfficialResults, saveOfficialResults } from "./actions";

type ResultsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    externalSynced?: string;
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
  teamAEn: string;
  teamBEn: string;
  teamAAliases: string[];
  teamBAliases: string[];
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
  const externalReview = await getExternalReview(matches);

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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>
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
        {params.externalSynced ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {params.externalSynced} resultados aplicados da ESPN.
          </div>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Conferir fonte externa</h2>
              <p className="mt-1 text-sm text-slate-600">
                Fonte: ESPN. Revise divergencias antes de aplicar.
              </p>
            </div>
            <form action={applyEspnOfficialResults}>
              <SubmitButton
                pendingText="Aplicando..."
                className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Aplicar resultados ESPN
              </SubmitButton>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Jogo</th>
                  <th className="px-5 py-3 font-medium">Partida</th>
                  <th className="px-5 py-3 font-medium">Banco</th>
                  <th className="px-5 py-3 font-medium">ESPN</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {externalReview.rows.map((row) => (
                  <tr key={row.match.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{row.match.matchNumber}</td>
                    <td className="px-5 py-3">
                      {row.match.teamA} x {row.match.teamB}
                    </td>
                    <td className="px-5 py-3">
                      {row.match.officialScoreA === null || row.match.officialScoreB === null
                        ? "Pendente"
                        : `${row.match.officialScoreA} x ${row.match.officialScoreB}`}
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {row.external
                        ? `${row.external.officialScoreA} x ${row.external.officialScoreB}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          row.status === "DIVERGENTE"
                            ? "rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                            : row.status === "OK"
                              ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {externalReview.rows.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                      Nenhum resultado externo encontrado agora.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <form action={saveOfficialResults} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Editar placares</h2>
              <p className="mt-1 text-sm text-slate-600">
                Preencha os jogos que terminaram e salve tudo de uma vez.
              </p>
            </div>
            <SubmitButton pendingText="Salvando...">
              Salvar todos
            </SubmitButton>
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
            <SubmitButton pendingText="Salvando...">
              Salvar todos
            </SubmitButton>
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
        teamAEn: fixture.homeTeam,
        teamBEn: fixture.awayTeam,
        teamAAliases: [fixture.homeTeam],
        teamBAliases: [fixture.awayTeam],
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
      supabase.from("teams").select("id, name, name_en, aliases"),
    ]);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));

  return matches.map((match) => ({
    id: match.id,
    matchNumber: match.source_match_number ?? match.display_order,
    date: match.match_date,
    time: match.match_time?.slice(0, 5) ?? "--:--",
    group: match.group_name,
    teamA: teamById.get(match.team_a_id)?.name ?? "Time A",
    teamB: teamById.get(match.team_b_id)?.name ?? "Time B",
    teamAEn: teamById.get(match.team_a_id)?.name_en ?? "Team A",
    teamBEn: teamById.get(match.team_b_id)?.name_en ?? "Team B",
    teamAAliases: teamById.get(match.team_a_id)?.aliases ?? [],
    teamBAliases: teamById.get(match.team_b_id)?.aliases ?? [],
    teamAFlagUrl: getTeamFlagUrl(teamById.get(match.team_a_id)?.name_en ?? ""),
    teamBFlagUrl: getTeamFlagUrl(teamById.get(match.team_b_id)?.name_en ?? ""),
    stadium: match.stadium ?? "-",
    city: match.city ?? "-",
    officialScoreA: match.official_score_a,
    officialScoreB: match.official_score_b,
    status: match.status,
  }));
}

async function getExternalReview(matches: MatchRow[]) {
  try {
    const externalResults = await fetchEspnOfficialResults();
    const rows = matches
      .map((match) => {
        const external = externalResults.find(
          (result) =>
            teamNameMatches(result.teamA, {
              name: match.teamA,
              nameEn: match.teamAEn,
              aliases: match.teamAAliases,
            }) &&
            teamNameMatches(result.teamB, {
              name: match.teamB,
              nameEn: match.teamBEn,
              aliases: match.teamBAliases,
            }),
        );

        if (!external) {
          return null;
        }

        const status =
          match.officialScoreA === external.officialScoreA &&
          match.officialScoreB === external.officialScoreB
            ? "OK"
            : "DIVERGENTE";

        return { match, external, status };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return { rows };
  } catch {
    return { rows: [] };
  }
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
