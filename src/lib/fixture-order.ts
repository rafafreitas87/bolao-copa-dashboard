import { getGroupStageFixtures, type WorldCupFixture } from "@/lib/world-cup-fixtures";

const spreadsheetMatchOrder = Array.from({ length: 72 }, (_, index) => index + 1);

export async function getSpreadsheetOrderedFixtures() {
  const fixtures = await getGroupStageFixtures();
  const orderByMatchNumber = new Map(
    spreadsheetMatchOrder.map((matchNumber, index) => [matchNumber, index]),
  );

  return [...fixtures].sort((a, b) => getFixtureOrder(a, orderByMatchNumber) - getFixtureOrder(b, orderByMatchNumber));
}

function getFixtureOrder(fixture: WorldCupFixture, orderByMatchNumber: Map<number, number>) {
  return orderByMatchNumber.get(fixture.matchNumber) ?? fixture.matchNumber;
}
