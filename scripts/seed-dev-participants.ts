import participants from "../data/seed-participants.json" with { type: "json" };
import { upsertDevParticipants } from "../src/lib/dev-store";

async function main() {
  const rows = await upsertDevParticipants(participants);
  console.log(`Participantes locais ativos: ${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
