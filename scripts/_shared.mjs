/**
 * Helpers partages par les scripts DB (migrate, seed, reset).
 *
 * Ces scripts tournent en Node pur (hors du runtime Next), donc on charge
 * `.env.local` manuellement et on cree un client `pg` a la demande. Ils sont
 * volontairement sans dependance de build (cf. contrainte pnpm du projet).
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, "..");
export const migrationsDir = resolve(projectRoot, "db/migrations");

/** Charge .env.local dans process.env (Node >= 20.12 : process.loadEnvFile). */
export function loadEnv() {
  const envPath = resolve(projectRoot, ".env.local");
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Deja charge via --env-file, ou variables deja presentes dans l'env.
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL manquant. Renseignez .env.local (voir .env.example).",
    );
  }
}

/** Ouvre une connexion Postgres. L'appelant doit appeler `client.end()`. */
export async function connect() {
  loadEnv();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}
