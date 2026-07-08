/**
 * Runner de migrations SQL (SPEC_DESIGN.md section 9.4 : migrations versionnees
 * dans le repo, client `pg`).
 *
 * Applique dans l'ordre lexicographique les fichiers `db/migrations/*.sql` qui
 * n'ont pas encore ete appliques, chacun dans sa propre transaction, et
 * enregistre leur nom dans `schema_migrations`. Idempotent : relancer ne
 * reapplique rien.
 *
 *   pnpm db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connect, migrationsDir } from "./_shared.mjs";

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedFilenames(client) {
  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

async function main() {
  const client = await connect();
  try {
    await ensureMigrationsTable(client);
    const done = await appliedFilenames(client);

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const pending = files.filter((f) => !done.has(f));
    if (pending.length === 0) {
      console.log("Aucune migration a appliquer (base a jour).");
      return;
    }

    for (const file of pending) {
      const sql = await readFile(resolve(migrationsDir, file), "utf8");
      process.stdout.write(`Application de ${file}... `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log("OK");
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("ECHEC");
        throw err;
      }
    }
    console.log(`${pending.length} migration(s) appliquee(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ECHEC migration:", err.message);
  process.exit(1);
});
