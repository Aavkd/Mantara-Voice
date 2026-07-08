import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiJson, runApi } from "@/lib/api/responses";
import { serializeNote, serializeTask } from "@/lib/api/serializers";
import { optionalUuid, parseUuid, readJsonObject } from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { getNoteTags } from "@/lib/captures/service";
import { pool } from "@/lib/db/client";
import type { Note, Task } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const noteId = parseUuid(id, "note id");
    await ensureResourceOwner("notes", noteId, user.id);

    const body = request.headers.get("content-length") === "0"
      ? {}
      : await readJsonObject(request).catch(() => ({}));
    const projectIdPatch = optionalUuid(body, "project_id");
    if (projectIdPatch) {
      await ensureResourceOwner("projects", projectIdPatch, user.id);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<Note>(
        `SELECT * FROM notes WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [noteId, user.id],
      );
      const current = existing.rows[0];
      const projectId =
        projectIdPatch === undefined ? current.project_id : projectIdPatch;

      const updated = await client.query<Note>(
        `UPDATE notes
         SET status = 'accepted', accepted_by = 'user', project_id = $1
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [projectId, noteId, user.id],
      );
      const note = updated.rows[0];

      const tasks = await client.query<Task>(
        `UPDATE tasks
         SET project_id = $1
         WHERE user_id = $2 AND note_id = $3
         RETURNING *`,
        [projectId, user.id, note.id],
      );

      if (projectId) {
        await client.query(
          `UPDATE projects SET last_activity_at = now() WHERE id = $1 AND user_id = $2`,
          [projectId, user.id],
        );
      }

      await client.query("COMMIT");

      return apiJson({
        note: serializeNote(note, await getNoteTags(note.id)),
        tasks: tasks.rows.map(serializeTask),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}
