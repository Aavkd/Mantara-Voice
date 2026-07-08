import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { serializeTask } from "@/lib/api/serializers";
import {
  optionalDateString,
  optionalEnum,
  optionalString,
  optionalUuid,
  parseUuid,
  readJsonObject,
} from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";
import type { Task, TaskPriority, TaskStatus } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

export async function PATCH(request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const taskId = parseUuid(id, "task id");
    await ensureResourceOwner("tasks", taskId, user.id);

    const body = await readJsonObject(request);
    const title = optionalString(body, "title");
    if (title === null) {
      throw apiError(400, "bad_request", "Le titre de la tache ne peut pas etre vide.");
    }
    const description = optionalString(body, "description");
    const status = optionalEnum(body, "status", TASK_STATUSES);
    const priority = optionalEnum(body, "priority", TASK_PRIORITIES);
    const dueDate = optionalDateString(body, "due_date");
    const projectId = optionalUuid(body, "project_id");
    if (projectId) {
      await ensureResourceOwner("projects", projectId, user.id);
    }

    const existing = await pool.query<Task>(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, user.id],
    );
    const task = existing.rows[0];
    const nextStatus = status ?? task.status;

    const { rows } = await pool.query<Task>(
      `UPDATE tasks
       SET
         title = $1,
         description = $2,
         status = $3,
         priority = $4,
         due_date = $5,
         project_id = $6,
         completed_at = CASE
           WHEN $3::task_status = 'done' AND completed_at IS NULL THEN now()
           WHEN $3::task_status <> 'done' THEN NULL
           ELSE completed_at
         END
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        title ?? task.title,
        description === undefined ? task.description : description,
        nextStatus,
        priority ?? task.priority,
        dueDate === undefined ? task.due_date : dueDate,
        projectId === undefined ? task.project_id : projectId,
        taskId,
        user.id,
      ],
    );

    return apiJson({ task: serializeTask(rows[0]) });
  });
}
