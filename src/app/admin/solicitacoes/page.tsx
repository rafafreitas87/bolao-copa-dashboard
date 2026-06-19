import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "../submit-button";
import { approveCorrectionRequest, rejectCorrectionRequest } from "./actions";

type AdminCorrectionRequestsPageProps = {
  searchParams: Promise<{
    approved?: string;
    rejected?: string;
    error?: string;
  }>;
};

type CorrectionRow = {
  id: string;
  participantId: string;
  participantName: string;
  matchNumber: number;
  teamA: string;
  teamB: string;
  currentScoreA: number | null;
  currentScoreB: number | null;
  requestedScoreA: number;
  requestedScoreB: number;
  requesterName: string | null;
  note: string | null;
  createdAt: string;
};

export default async function AdminCorrectionRequestsPage({
  searchParams,
}: AdminCorrectionRequestsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const rows = await getPendingCorrectionRequests();
  const grouped = groupByParticipant(rows);

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Solicitacoes de revisao
          </p>
          <h1 className="text-3xl font-semibold">Correcoes pendentes</h1>
          <p className="mt-2 text-sm text-slate-600">
            Aprove ou rejeite cada palpite individualmente.
          </p>
        </header>

        {params.approved ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Solicitacao aprovada e palpite atualizado.
          </div>
        ) : null}
        {params.rejected ? (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Solicitacao rejeitada.
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        <div className="space-y-6">
          {Object.entries(grouped).map(([participantName, participantRows]) => (
            <section key={participantName} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold">{participantName}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {participantRows.length} solicitacao{participantRows.length === 1 ? "" : "es"} pendente
                  {participantRows.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Jogo</th>
                      <th className="px-5 py-3 font-medium">Partida</th>
                      <th className="px-5 py-3 font-medium">Atual</th>
                      <th className="px-5 py-3 font-medium">Solicitado</th>
                      <th className="px-5 py-3 font-medium">Pedido por</th>
                      <th className="px-5 py-3 font-medium">Obs.</th>
                      <th className="px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 align-top">
                        <td className="px-5 py-3 font-semibold">{row.matchNumber}</td>
                        <td className="px-5 py-3">{row.teamA} x {row.teamB}</td>
                        <td className="px-5 py-3">
                          {row.currentScoreA === null || row.currentScoreB === null
                            ? "-"
                            : `${row.currentScoreA} x ${row.currentScoreB}`}
                        </td>
                        <td className="px-5 py-3 font-bold text-emerald-800">
                          {row.requestedScoreA} x {row.requestedScoreB}
                        </td>
                        <td className="px-5 py-3">{row.requesterName ?? "-"}</td>
                        <td className="max-w-56 px-5 py-3 text-slate-600">{row.note ?? "-"}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <form action={approveCorrectionRequest}>
                              <input type="hidden" name="requestId" value={row.id} />
                              <SubmitButton pendingText="Aprovando...">
                                Aprovar
                              </SubmitButton>
                            </form>
                            <form action={rejectCorrectionRequest} className="flex gap-2">
                              <input type="hidden" name="requestId" value={row.id} />
                              <input
                                name="adminNote"
                                placeholder="Motivo"
                                className="h-10 w-28 rounded-md border border-slate-300 px-2 text-xs"
                              />
                              <SubmitButton
                                pendingText="Rejeitando..."
                                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                              >
                                Rejeitar
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {rows.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Nenhuma solicitacao pendente.
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

async function getPendingCorrectionRequests(): Promise<CorrectionRow[]> {
  const supabase = createAdminClient();
  const [
    { data: requests, error: requestsError },
    { data: participants, error: participantsError },
    { data: matches, error: matchesError },
    { data: teams, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("prediction_correction_requests")
      .select(
        "id, participant_id, match_id, current_score_a, current_score_b, requested_score_a, requested_score_b, requester_name, note, created_at",
      )
      .eq("status", "PENDING")
      .order("created_at", { ascending: true }),
    supabase.from("participants").select("id, display_name"),
    supabase.from("matches").select("id, source_match_number, team_a_id, team_b_id"),
    supabase.from("teams").select("id, name_en"),
  ]);

  if (requestsError) throw new Error(requestsError.message);
  if (participantsError) throw new Error(participantsError.message);
  if (matchesError) throw new Error(matchesError.message);
  if (teamsError) throw new Error(teamsError.message);

  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const teamNameById = new Map(teams.map((team) => [team.id, team.name_en]));

  return requests.map((request) => {
    const match = matchById.get(request.match_id);

    return {
      id: request.id,
      participantId: request.participant_id,
      participantName:
        participantById.get(request.participant_id)?.display_name ?? "Participante nao encontrado",
      matchNumber: match?.source_match_number ?? 0,
      teamA: match ? teamNameById.get(match.team_a_id) ?? "Time A" : "Time A",
      teamB: match ? teamNameById.get(match.team_b_id) ?? "Time B" : "Time B",
      currentScoreA: request.current_score_a,
      currentScoreB: request.current_score_b,
      requestedScoreA: request.requested_score_a,
      requestedScoreB: request.requested_score_b,
      requesterName: request.requester_name,
      note: request.note,
      createdAt: request.created_at,
    };
  });
}

function groupByParticipant(rows: CorrectionRow[]) {
  return rows.reduce<Record<string, CorrectionRow[]>>((acc, row) => {
    acc[row.participantName] ??= [];
    acc[row.participantName].push(row);
    return acc;
  }, {});
}
