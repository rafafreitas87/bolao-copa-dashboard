export type ExternalOfficialResult = {
  source: string;
  sourceUrl: string;
  teamA: string;
  teamB: string;
  officialScoreA: number;
  officialScoreB: number;
};

const ESPN_RESULTS_URL =
  "https://www.espn.com/soccer/story/_/id/48939282/2026-fifa-world-cup-fixtures-results-match-schedule-group-stage-knockout-rounds-bracket";

export async function fetchEspnOfficialResults(): Promise<ExternalOfficialResult[]> {
  const response = await fetch(ESPN_RESULTS_URL, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 10 },
  });

  if (!response.ok) {
    throw new Error(`ESPN retornou ${response.status}`);
  }

  const html = await response.text();
  const start = html.indexOf("<h3><u>Thursday, June 11");
  const end = html.indexOf("<h3><u>Monday, June 22");
  const relevantHtml = html.slice(Math.max(start, 0), end > start ? end : undefined);
  const text = relevantHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");

  const resultPattern =
    /(?:Group\s+[A-L]:\s*)?([A-Za-zÀ-ÖØ-öø-ÿ.'\s]+?)\s+(\d+)-(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ.'\s]+?)\s*(?:\(|,|-)/g;

  return [...text.matchAll(resultPattern)]
    .map((match) => ({
      source: "ESPN",
      sourceUrl: ESPN_RESULTS_URL,
      teamA: cleanTeamName(match[1]),
      teamB: cleanTeamName(match[4]),
      officialScoreA: Number(match[2]),
      officialScoreB: Number(match[3]),
    }))
    .filter((result) => result.teamA.length > 0 && result.teamB.length > 0);
}

export function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(REPUBLIC|REPUBLICA|DEMOCRATICA|DEMOCRATIC|DO|DA|DE|E|THE)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function teamNameMatches(
  value: string,
  team: { name: string; nameEn: string; aliases: string[] },
) {
  const normalizedValue = normalizeTeamName(value);
  const candidates = [team.name, team.nameEn, ...team.aliases].map(normalizeTeamName);

  return candidates.some(
    (candidate) =>
      candidate === normalizedValue ||
      candidate.includes(normalizedValue) ||
      normalizedValue.includes(candidate),
  );
}

function cleanTeamName(value: string) {
  return value
    .replace(/^[A-Za-z]+day,\s+[A-Za-z]+\s+\d+\s*/i, "")
    .replace(/^Group\s+[A-L]:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
