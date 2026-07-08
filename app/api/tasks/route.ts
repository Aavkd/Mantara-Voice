import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { serializeTask } from "@/lib/api/serializers";
import { parseUuid } from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";
import type { Task, TaskStatus } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];

export async function GET(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const projectId = url.searchParams.get("project_id");

    if (status && !TASK_STATUSES.includes(status as TaskStatus)) {
      throw apiError(400, "bad_request", "Le filtre status est invalide.");
    }
    if (projectId) {
      await ensureResourceOwner("projects", parseUuid(projectId, "project_id"), user.id);
    }

    const params: string[] = [user.id];
    const clauses = ["user_id = $1"];
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      clauses.push(`project_id = $${params.length}`);
    }

    const { rows } = await pool.query<Task>(
      `SELECT *
       FROM tasks
       WHERE ${clauses.join(" AND ")}
       ORDER BY
         CASE status WHEN 'todo' THEN 1 WHEN 'doing' THEN 2 ELSE 3 END,
         due_date NULLS LAST,
         created_at DESC`,
      params,
    );

    return apiJson({ tasks: rows.map(serializeTask) });
  });
}
