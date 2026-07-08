import { apiJson, runApi } from "@/lib/api/responses";
import { serializeNote } from "@/lib/api/serializers";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";
import type { Note } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InboxRow = Note & {
  project_name: string | null;
  task_count: number;
  tags: string[] | null;
};

export async function GET() {
  return runApi(async () => {
    const user = await requireSession();
    const { rows } = await pool.query<InboxRow>(
      `SELECT
         n.*,
         p.name AS project_name,
         count(DISTINCT tk.id)::int AS task_count,
         array_remove(array_agg(DISTINCT tg.name), NULL) AS tags
       FROM notes n
       LEFT JOIN projects p ON p.id = n.project_id AND p.user_id = n.user_id
       LEFT JOIN tasks tk ON tk.note_id = n.id AND tk.user_id = n.user_id
       LEFT JOIN note_tags nt ON nt.note_id = n.id
       LEFT JOIN tags tg ON tg.id = nt.tag_id AND tg.user_id = n.user_id
       WHERE n.user_id = $1 AND n.status = 'inbox'
       GROUP BY n.id, p.name
       ORDER BY n.created_at DESC`,
      [user.id],
    );

    return apiJson({
      items: rows.map((row) => {
        const tags = row.tags ?? [];
        return {
          note: serializeNote(row, tags),
          project_match: {
            project_id: row.project_id,
            project_name: row.project_name,
            confidence: row.confidence,
          },
          excerpt: row.body.length > 180 ? `${row.body.slice(0, 177)}...` : row.body,
          task_count: row.task_count,
          tags,
        };
      }),
    });
  });
}
