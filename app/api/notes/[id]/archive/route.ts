import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiJson, runApi } from "@/lib/api/responses";
import { serializeNote } from "@/lib/api/serializers";
import { parseUuid } from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { getNoteTags } from "@/lib/captures/service";
import { pool } from "@/lib/db/client";
import type { Note } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const noteId = parseUuid(id, "note id");
    await ensureResourceOwner("notes", noteId, user.id);

    const { rows } = await pool.query<Note>(
      `UPDATE notes
       SET status = 'archived'
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [noteId, user.id],
    );

    return apiJson({
      note: serializeNote(rows[0], await getNoteTags(rows[0].id)),
    });
  });
}
