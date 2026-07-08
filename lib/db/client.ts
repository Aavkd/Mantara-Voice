import { Pool } from "pg";

/**
 * Client Postgres partage (cote serveur uniquement).
 *
 * Regle (SPEC_DESIGN.md section 9.4) : la base n'est accessible que depuis le
 * backend, jamais depuis le frontend. Chaque requete metier doit filtrer par
 * `user_id` au niveau applicatif.
 *
 * Le schema et les migrations arrivent en phase 1 ; ici on n'expose que le pool
 * et un check de sante pour la phase 0.
 */

// On reutilise le pool entre les rechargements a chaud de Next en dev.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant dans l'environnement");
  }
  return new Pool({ connectionString });
}

export const pool: Pool = globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export type DbHealth = {
  ok: boolean;
  now?: string;
  error?: string;
};

/** Verifie que la base repond (SELECT 1). Utilise par GET /api/health. */
export async function checkDbHealth(): Promise<DbHealth> {
  try {
    const result = await pool.query<{ now: string }>("SELECT now() AS now");
    return { ok: true, now: result.rows[0]?.now };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
