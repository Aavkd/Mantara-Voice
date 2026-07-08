import { apiError } from "@/lib/api/responses";
import { pool } from "@/lib/db/client";

type OwnedTable = "captures" | "notes" | "projects" | "tasks";

const TABLE_NAMES: Record<OwnedTable, string> = {
  captures: "captures",
  notes: "notes",
  projects: "projects",
  tasks: "tasks",
};

export async function ensureResourceOwner(
  table: OwnedTable,
  id: string,
  userId: string,
): Promise<void> {
  const tableName = TABLE_NAMES[table];
  const owned = await pool.query(`SELECT 1 FROM ${tableName} WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
  if ((owned.rowCount ?? 0) > 0) {
    return;
  }

  const exists = await pool.query(`SELECT 1 FROM ${tableName} WHERE id = $1`, [id]);
  if ((exists.rowCount ?? 0) > 0) {
    throw apiError(403, "forbidden", "Cette ressource appartient a un autre utilisateur.");
  }

  throw apiError(404, "not_found", "Ressource introuvable.");
}
