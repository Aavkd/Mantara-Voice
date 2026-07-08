/**
 * Test de fumee de la phase 0 : GET /api/health doit repondre.
 *
 * Prerequis : le serveur tourne (`pnpm dev`) et, idealement, Postgres est up
 * (`pnpm db:up`). Usage :
 *   node tests/health.mjs                       # cible http://localhost:3000
 *   BASE_URL=https://api.mantara-voice.fr node tests/health.mjs
 *
 * Sortie : code 0 si la sante est nominale, 1 sinon.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const url = `${BASE_URL}/api/health`;
  const res = await fetch(url);
  const body = await res.json();
  console.log(`GET ${url} -> ${res.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (res.status !== 200) {
    console.error(
      body?.db?.ok === false
        ? "ECHEC: backend up mais base injoignable (lancez `pnpm db:up`)."
        : "ECHEC: /api/health n'a pas renvoye 200.",
    );
    process.exit(1);
  }
  console.log("OK: backend + base en bonne sante.");
}

main().catch((err) => {
  console.error("ECHEC: impossible de joindre le backend.", err.message);
  console.error("Le serveur est-il demarre ? (`pnpm dev`)");
  process.exit(1);
});
