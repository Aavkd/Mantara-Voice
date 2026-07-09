import bcrypt from "bcryptjs";
import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { readJsonObject, requiredString } from "@/lib/api/validation";
import { pool } from "@/lib/db/client";
import type { User } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = await readJsonObject(request);
    const name = requiredString(body, "name", "Le nom est requis.");
    const email = normalizeEmail(requiredString(body, "email", "L'e-mail est requis."));
    const password = requiredString(body, "password", "Le mot de passe est requis.");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw apiError(400, "bad_request", "L'e-mail est invalide.");
    }
    if (password.length < 8) {
      throw apiError(
        400,
        "bad_request",
        "Le mot de passe doit contenir au moins 8 caracteres.",
      );
    }

    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );
    if (existing.rows[0]) {
      throw apiError(409, "conflict", "Un compte existe deja avec cet e-mail.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query<User>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, password_hash, email_verified_at, created_at`,
        [email, name, passwordHash],
      );
      await client.query(
        `INSERT INTO user_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [created.rows[0].id],
      );
      await client.query("COMMIT");

      return apiJson(
        {
          user: {
            id: created.rows[0].id,
            email: created.rows[0].email,
            name: created.rows[0].name,
          },
        },
        201,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}
