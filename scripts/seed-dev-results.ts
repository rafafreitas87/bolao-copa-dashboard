import results from "../data/official-results-through-2026-06-17.json" with { type: "json" };
import { saveDevResult } from "../src/lib/dev-store";

async function main() {
  for (const result of results) {
    await saveDevResult(result);
  }

  console.log(`Resultados oficiais locais preenchidos: ${results.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
