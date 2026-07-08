import type { PoolClient } from "pg";
import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { serializeNote, serializeTask } from "@/lib/api/serializers";
import {
  optionalStringArray,
  optionalUuid,
  parseUuid,
  readJsonObject,
} from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { getNoteTags, replaceNoteTags } from "@/lib/captures/service";
import { pool } from "@/lib/db/client";
import type { JsonObject } from "@/lib/api/validation";
import type { Note, Task, TaskPriority, TaskStatus } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TaskDraft = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

function stringField(body: JsonObject, key: string, current: string): string {
  if (!(key in body)) {
    return current;
  }
  const value = body[key];
  if (typeof value !== "string") {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre une chaine.`);
  }
  if (key === "title" && value.trim() === "") {
    throw apiError(400, "bad_request", "Le titre ne peut pas etre vide.");
  }
  return key === "body" ? value : value.trim();
}

function parseTaskDrafts(body: JsonObject): TaskDraft[] | undefined {
  if (!("tasks" in body)) {
    return undefined;
  }
  const value = body.tasks;
  if (!Array.isArray(value)) {
    throw apiError(400, "bad_request", "Le champ tasks doit etre une liste.");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw apiError(400, "bad_request", `tasks[${index}] doit etre un objet.`);
    }
    const task = item as JsonObject;
    const title = task.title;
    if (typeof title !== "string" || title.trim() === "") {
      throw apiError(400, "bad_request", `tasks[${index}].title est requis.`);
    }

    const description = task.description;
    if (description !== undefined && description !== null && typeof description !== "string") {
      throw apiError(
        400,
        "bad_request",
        `tasks[${index}].description doit etre une chaine ou null.`,
      );
    }

    const status = task.status ?? "todo";
    if (typeof status !== "string" || !TASK_STATUSES.includes(status as TaskStatus)) {
      throw apiError(400, "bad_request", `tasks[${index}].status est invalide.`);
    }

    const priority = task.priority ?? "normal";
    if (
      typeof priority !== "string" ||
      !TASK_PRIORITIES.includes(priority as TaskPriority)
    ) {
      throw apiError(400, "bad_request", `tasks[${index}].priority est invalide.`);
    }

    const dueDate = task.due_date ?? null;
    if (
      dueDate !== null &&
      (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
    ) {
      throw apiError(400, "bad_request", `tasks[${index}].due_date est invalide.`);
    }

    return {
      title: title.trim(),
      description:
        typeof description === "string" && description.trim() ? description.trim() : null,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      due_date: dueDate,
    };
  });
}

async function insertDraftTasks(
  client: PoolClient,
  userId: string,
  note: Note,
  tasks: TaskDraft[],
): Promise<Task[]> {
  const created: Task[] = [];
  for (const task of tasks) {
    const { rows } = await client.query<Task>(
      `INSERT INTO tasks
         (user_id, project_id, note_id, capture_id, title, description, status, priority, due_date, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $7::task_status = 'done' THEN now() ELSE NULL END)
       RETURNING *`,
      [
        userId,
        note.project_id,
        note.id,
        note.capture_id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.due_date,
      ],
    );
    created.push(rows[0]);
  }
  return created;
}

export async function PATCH(request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const noteId = parseUuid(id, "note id");
    await ensureResourceOwner("notes", noteId, user.id);

    const body = await readJsonObject(request);
    const projectIdPatch = optionalUuid(body, "project_id");
    if (projectIdPatch) {
      await ensureResourceOwner("projects", projectIdPatch, user.id);
    }
    const tagsPatch = optionalStringArray(body, "tags");
    const taskDrafts = parseTaskDrafts(body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query<Note>(
        `SELECT * FROM notes WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [noteId, user.id],
      );
      const existing = existingResult.rows[0];
      const nextProjectId =
        projectIdPatch === undefined ? existing.project_id : projectIdPatch;

      const updatedResult = await client.query<Note>(
        `UPDATE notes
         SET title = $1, body = $2, project_id = $3
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [
          stringField(body, "title", existing.title),
          stringField(body, "body", existing.body),
          nextProjectId,
          noteId,
          user.id,
        ],
      );
      const note = updatedResult.rows[0];

      if (tagsPatch) {
        await replaceNoteTags(client, user.id, note.id, tagsPatch);
      }

      let tasks: Task[];
      if (taskDrafts) {
        await client.query(`DELETE FROM tasks WHERE user_id = $1 AND note_id = $2`, [
          user.id,
          note.id,
        ]);
        tasks = await insertDraftTasks(client, user.id, note, taskDrafts);
      } else {
        const taskResult = await client.query<Task>(
          `UPDATE tasks
           SET project_id = $1
           WHERE user_id = $2 AND note_id = $3
           RETURNING *`,
          [note.project_id, user.id, note.id],
        );
        tasks = taskResult.rows;
      }

      await client.query("COMMIT");

      return apiJson({
        note: serializeNote(note, tagsPatch ?? (await getNoteTags(note.id))),
        tasks: tasks.map(serializeTask),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}
