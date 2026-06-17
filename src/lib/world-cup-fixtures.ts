export type WorldCupFixture = {
  matchNumber: number;
  date: string;
  kickoffUtc: string;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  hostCity: string;
  matchUrl: string;
};

type FixturesPayload = {
  fixtures: WorldCupFixture[];
};

const defaultFixturesUrl = "https://www.thestatsapi.com/world-cup/data/fixtures.json";

export async function getGroupStageFixtures() {
  const response = await fetch(process.env.WORLD_CUP_FIXTURES_URL ?? defaultFixturesUrl, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar partidas: ${response.status}`);
  }

  const payload = (await response.json()) as FixturesPayload;

  return payload.fixtures
    .filter((fixture) => fixture.stage === "group-stage")
    .sort((a, b) => a.matchNumber - b.matchNumber);
}
