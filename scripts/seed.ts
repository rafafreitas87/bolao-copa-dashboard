import { createClient } from "@supabase/supabase-js";

type Fixture = {
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
  source: string;
  fixtures: Fixture[];
};

type TeamSeed = {
  name: string;
  nameEn: string;
  code: string;
  flagUrl: string | null;
  aliases: string[];
};

const SUPABASE_URL = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
const FIXTURES_URL =
  process.env.WORLD_CUP_FIXTURES_URL ??
  "https://www.thestatsapi.com/world-cup/data/fixtures.json";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const teamsByEnglishName: Record<string, TeamSeed> = {
  Algeria: team("Argelia", "Algeria", "ALG", "dz", ["Argelia", "Algeria", "ALG"]),
  Argentina: team("Argentina", "Argentina", "ARG", "ar", ["Argentina", "ARG"]),
  Australia: team("Australia", "Australia", "AUS", "au", ["Australia", "AUS"]),
  Austria: team("Austria", "Austria", "AUT", "at", ["Austria", "AUT"]),
  Belgium: team("Belgica", "Belgium", "BEL", "be", ["Belgica", "Belgium", "BEL"]),
  "Bosnia and Herzegovina": team("Bosnia e Herzegovina", "Bosnia and Herzegovina", "BIH", "ba", [
    "Bosnia",
    "Bosnia e Herzegovina",
    "Bosnia and Herzegovina",
    "BIH",
  ]),
  Brazil: team("Brasil", "Brazil", "BRA", "br", ["Brasil", "Brazil", "BRA"]),
  "Cabo Verde": team("Cabo Verde", "Cabo Verde", "CPV", "cv", [
    "Cabo Verde",
    "Cape Verde",
    "CPV",
  ]),
  Canada: team("Canada", "Canada", "CAN", "ca", ["Canada", "CAN"]),
  Colombia: team("Colombia", "Colombia", "COL", "co", ["Colombia", "COL"]),
  "Congo DR": team("RD Congo", "Congo DR", "COD", "cd", [
    "RD Congo",
    "Congo DR",
    "DR Congo",
    "Republica Democratica do Congo",
    "COD",
  ]),
  "Cote d'Ivoire": team("Costa do Marfim", "Cote d'Ivoire", "CIV", "ci", [
    "Costa do Marfim",
    "Cote d'Ivoire",
    "Ivory Coast",
    "CIV",
  ]),
  Croatia: team("Croacia", "Croatia", "CRO", "hr", ["Croacia", "Croatia", "CRO"]),
  Curacao: team("Curacao", "Curacao", "CUW", "cw", ["Curacao", "Curacao", "CUW"]),
  Czechia: team("Tchequia", "Czechia", "CZE", "cz", [
    "Tchequia",
    "Republica Tcheca",
    "Czechia",
    "Czech Republic",
    "CZE",
  ]),
  Ecuador: team("Equador", "Ecuador", "ECU", "ec", ["Equador", "Ecuador", "ECU"]),
  Egypt: team("Egito", "Egypt", "EGY", "eg", ["Egito", "Egypt", "EGY"]),
  England: team("Inglaterra", "England", "ENG", null, ["Inglaterra", "England", "ENG"]),
  France: team("Franca", "France", "FRA", "fr", ["Franca", "France", "FRA"]),
  Germany: team("Alemanha", "Germany", "GER", "de", [
    "Alemanha",
    "Germany",
    "Deutschland",
    "GER",
  ]),
  Ghana: team("Gana", "Ghana", "GHA", "gh", ["Gana", "Ghana", "GHA"]),
  Haiti: team("Haiti", "Haiti", "HAI", "ht", ["Haiti", "HAI"]),
  "IR Iran": team("Ira", "IR Iran", "IRN", "ir", ["Ira", "Iran", "IR Iran", "IRN"]),
  Iraq: team("Iraque", "Iraq", "IRQ", "iq", ["Iraque", "Iraq", "IRQ"]),
  Japan: team("Japao", "Japan", "JPN", "jp", ["Japao", "Japan", "JPN"]),
  Jordan: team("Jordania", "Jordan", "JOR", "jo", ["Jordania", "Jordan", "JOR"]),
  "Korea Republic": team("Coreia do Sul", "Korea Republic", "KOR", "kr", [
    "Coreia do Sul",
    "South Korea",
    "Korea Republic",
    "KOR",
  ]),
  Mexico: team("Mexico", "Mexico", "MEX", "mx", ["Mexico", "MEX"]),
  Morocco: team("Marrocos", "Morocco", "MAR", "ma", ["Marrocos", "Morocco", "MAR"]),
  Netherlands: team("Holanda", "Netherlands", "NED", "nl", [
    "Holanda",
    "Paises Baixos",
    "Netherlands",
    "NED",
  ]),
  "New Zealand": team("Nova Zelandia", "New Zealand", "NZL", "nz", [
    "Nova Zelandia",
    "New Zealand",
    "NZL",
  ]),
  Norway: team("Noruega", "Norway", "NOR", "no", ["Noruega", "Norway", "NOR"]),
  Panama: team("Panama", "Panama", "PAN", "pa", ["Panama", "PAN"]),
  Paraguay: team("Paraguai", "Paraguay", "PAR", "py", ["Paraguai", "Paraguay", "PAR"]),
  Portugal: team("Portugal", "Portugal", "POR", "pt", ["Portugal", "POR"]),
  Qatar: team("Catar", "Qatar", "QAT", "qa", ["Catar", "Qatar", "QAT"]),
  "Saudi Arabia": team("Arabia Saudita", "Saudi Arabia", "KSA", "sa", [
    "Arabia Saudita",
    "Saudi Arabia",
    "KSA",
  ]),
  Scotland: team("Escocia", "Scotland", "SCO", null, ["Escocia", "Scotland", "SCO"]),
  Senegal: team("Senegal", "Senegal", "SEN", "sn", ["Senegal", "SEN"]),
  "South Africa": team("Africa do Sul", "South Africa", "RSA", "za", [
    "Africa do Sul",
    "South Africa",
    "RSA",
  ]),
  Spain: team("Espanha", "Spain", "ESP", "es", ["Espanha", "Spain", "ESP"]),
  Sweden: team("Suecia", "Sweden", "SWE", "se", ["Suecia", "Sweden", "SWE"]),
  Switzerland: team("Suica", "Switzerland", "SUI", "ch", ["Suica", "Switzerland", "SUI"]),
  Tunisia: team("Tunisia", "Tunisia", "TUN", "tn", ["Tunisia", "TUN"]),
  Turkiye: team("Turquia", "Turkiye", "TUR", "tr", ["Turquia", "Turkey", "Turkiye", "TUR"]),
  "United States": team("Estados Unidos", "United States", "USA", "us", [
    "Estados Unidos",
    "EUA",
    "USA",
    "United States",
    "United States of America",
  ]),
  Uruguay: team("Uruguai", "Uruguay", "URU", "uy", ["Uruguai", "Uruguay", "URU"]),
  Uzbekistan: team("Uzbequistao", "Uzbekistan", "UZB", "uz", [
    "Uzbequistao",
    "Uzbekistan",
    "UZB",
  ]),
};

const hostCities: Record<string, { city: string; hostCountry: string }> = {
  atlanta: { city: "Atlanta", hostCountry: "United States" },
  boston: { city: "Boston", hostCountry: "United States" },
  dallas: { city: "Dallas", hostCountry: "United States" },
  guadalajara: { city: "Guadalajara", hostCountry: "Mexico" },
  houston: { city: "Houston", hostCountry: "United States" },
  "kansas-city": { city: "Kansas City", hostCountry: "United States" },
  "los-angeles": { city: "Los Angeles", hostCountry: "United States" },
  "mexico-city": { city: "Mexico City", hostCountry: "Mexico" },
  miami: { city: "Miami", hostCountry: "United States" },
  monterrey: { city: "Monterrey", hostCountry: "Mexico" },
  "new-york": { city: "New York/New Jersey", hostCountry: "United States" },
  philadelphia: { city: "Philadelphia", hostCountry: "United States" },
  "san-francisco": { city: "San Francisco Bay Area", hostCountry: "United States" },
  seattle: { city: "Seattle", hostCountry: "United States" },
  toronto: { city: "Toronto", hostCountry: "Canada" },
  vancouver: { city: "Vancouver", hostCountry: "Canada" },
};

async function main() {
  await seedAdmins();
  await seedConfigs();

  const payload = await getFixtures();
  const groupStageFixtures = payload.fixtures
    .filter((fixture) => fixture.stage === "group-stage")
    .sort((a, b) => a.matchNumber - b.matchNumber);

  if (groupStageFixtures.length !== 72) {
    throw new Error(`Expected 72 group-stage fixtures, got ${groupStageFixtures.length}`);
  }

  await seedTeams(groupStageFixtures);
  await seedMatches(groupStageFixtures);
  await seedParticipants();
  await seedOfficialResults();

  console.log("Seed complete.");
  console.log(`Admins: ${getAdminEmails().join(", ")}`);
  console.log(`Teams: ${Object.keys(teamsByEnglishName).length}`);
  console.log(`Group-stage matches: ${groupStageFixtures.length}`);
  console.log(`Fixtures source: ${payload.source || FIXTURES_URL}`);
}

async function seedParticipants() {
  const rows = (await import("../data/seed-participants.json")).default.map(
    (participant: { name: string; displayName: string; email?: string | null }) => ({
      name: participant.name,
      display_name: participant.displayName,
      email: participant.email ?? null,
      active: true,
    }),
  );

  const { error } = await supabase.from("participants").upsert(rows, {
    onConflict: "display_name",
  });

  if (error) {
    throw new Error(`Could not seed participants: ${error.message}`);
  }
}

async function seedOfficialResults() {
  const rows = (await import("../data/official-results-through-2026-06-17.json")).default as Array<{
    matchNumber: number;
    officialScoreA: number;
    officialScoreB: number;
  }>;

  for (const result of rows) {
    const { error } = await supabase
      .from("matches")
      .update({
        official_score_a: result.officialScoreA,
        official_score_b: result.officialScoreB,
        status: "FINISHED",
      })
      .eq("source_match_number", result.matchNumber);

    if (error) {
      throw new Error(`Could not seed result ${result.matchNumber}: ${error.message}`);
    }
  }
}

async function seedAdmins() {
  const emails = getAdminEmails();
  const password = mustGetEnv("SEED_ADMIN_PASSWORD");

  for (const email of emails) {
    const existingUser = await findAuthUserByEmail(email);
    const user =
      existingUser ??
      (
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: email.split("@")[0],
          },
        })
      ).data.user;

    if (!user) {
      throw new Error(`Could not create auth user for ${email}`);
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        name: user.user_metadata?.name ?? email.split("@")[0],
        role: "ADMIN",
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`Could not upsert ADMIN profile ${email}: ${error.message}`);
    }
  }
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Could not list auth users: ${error.message}`);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function seedConfigs() {
  const { error } = await supabase.from("configs").upsert(
    [
      { key: "pool_name", value: "Bolao Copa 2026" },
      { key: "participants_can_view_others_predictions", value: false },
      { key: "exact_score_points", value: 3 },
      { key: "correct_outcome_points", value: 1 },
      { key: "main_chart_participant_limit", value: 10 },
      { key: "participant_import_enabled", value: false },
    ],
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`Could not seed configs: ${error.message}`);
  }
}

async function getFixtures() {
  const response = await fetch(FIXTURES_URL);

  if (!response.ok) {
    throw new Error(`Could not download fixtures: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as FixturesPayload;
}

async function seedTeams(fixtures: Fixture[]) {
  const names = new Set(fixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam]));
  const missing = [...names].filter((name) => !teamsByEnglishName[name]);

  if (missing.length > 0) {
    throw new Error(`Missing team seed metadata for: ${missing.join(", ")}`);
  }

  const rows = [...names].map((name) => {
    const seed = teamsByEnglishName[name];

    return {
      name: seed.name,
      name_en: seed.nameEn,
      code: seed.code,
      flag_url: seed.flagUrl,
      aliases: seed.aliases,
    };
  });

  const { error } = await supabase.from("teams").upsert(rows, { onConflict: "code" });

  if (error) {
    throw new Error(`Could not seed teams: ${error.message}`);
  }
}

async function seedMatches(fixtures: Fixture[]) {
  const { data: teams, error: teamsError } = await supabase.from("teams").select("id, code");

  if (teamsError) {
    throw new Error(`Could not fetch teams: ${teamsError.message}`);
  }

  const teamIdByCode = new Map(teams.map((teamRow) => [teamRow.code, teamRow.id]));

  const rows = fixtures.map((fixture) => {
    const teamA = teamsByEnglishName[fixture.homeTeam];
    const teamB = teamsByEnglishName[fixture.awayTeam];
    const city = hostCities[fixture.hostCity];
    const kickoff = new Date(fixture.kickoffUtc);

    if (!city) {
      throw new Error(`Missing host city metadata for: ${fixture.hostCity}`);
    }

    const teamAId = teamIdByCode.get(teamA.code);
    const teamBId = teamIdByCode.get(teamB.code);

    if (!teamAId || !teamBId) {
      throw new Error(`Could not resolve team ids for match ${fixture.matchNumber}`);
    }

    return {
      match_date: fixture.date,
      match_time: kickoff.toISOString().slice(11, 19),
      kickoff_utc: fixture.kickoffUtc,
      group_name: fixture.group,
      round: getGroupRound(fixture.matchNumber),
      team_a_id: teamAId,
      team_b_id: teamBId,
      stadium: fixture.stadium,
      city: city.city,
      host_country: city.hostCountry,
      status: "PENDING" as const,
      display_order: fixture.matchNumber,
      source_match_number: fixture.matchNumber,
      source_url: fixture.matchUrl,
    };
  });

  const { error } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "source_match_number" });

  if (error) {
    throw new Error(`Could not seed matches: ${error.message}`);
  }
}

function getGroupRound(matchNumber: number) {
  if (matchNumber <= 24) {
    return "Rodada 1";
  }

  if (matchNumber <= 48) {
    return "Rodada 2";
  }

  return "Rodada 3";
}

function team(
  name: string,
  nameEn: string,
  code: string,
  flagCountryCode: string | null,
  aliases: string[],
): TeamSeed {
  return {
    name,
    nameEn,
    code,
    flagUrl: flagCountryCode ? `https://flagcdn.com/${flagCountryCode}.svg` : null,
    aliases: Array.from(new Set([name, nameEn, code, ...aliases])),
  };
}

function getAdminEmails() {
  return mustGetEnv("SEED_ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function mustGetEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
