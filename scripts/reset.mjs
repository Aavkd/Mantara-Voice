/**
 * Remet la base a zero : supprime et recree le schema `public`.
 *
 * DEV UNIQUEMENT — destructif. Refuse de tourner si NODE_ENV=production.
 * Sert a verifier que les migrations s'appliquent sur une base vierge
 * (critere d'acceptation phase 1).
 *
 *   pnpm db:reset          # drop + recree le schema
 *   pnpm db:reset:all      # + migrate + seed (voir package.json)
 */
import { connect } from "./_shared.mjs";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:reset est interdit en production.");
  }
  const client = await connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    console.log("Schema public reinitialise (base vierge).");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ECHEC reset:", err.message);
  process.exit(1);
});
