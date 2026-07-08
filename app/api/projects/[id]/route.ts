import { ensureResourceOwner } from "@/lib/api/ownership";
import { apiError, apiJson, runApi } from "@/lib/api/responses";
import {
  serializeCapture,
  serializeNote,
  serializeProject,
  serializeTask,
} from "@/lib/api/serializers";
import {
  optionalEnum,
  optionalString,
  parseUuid,
  readJsonObject,
} from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { getNoteTags } from "@/lib/captures/service";
import { pool } from "@/lib/db/client";
import type {
  Capture,
  Note,
  Project,
  ProjectStatus,
  ProjectType,
  Task,
} from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PROJECT_TYPES: ProjectType[] = [
  "client_project",
  "internal",
  "opportunity",
  "technical",
  "personal",
  "other",
];
const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "archived", "completed"];

export async function GET(_request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const projectId = parseUuid(id, "project id");
    await ensureResourceOwner("projects", projectId, user.id);

    const project = await pool.query<Project>(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, user.id],
    );
    const notes = await pool.query<Note>(
      `SELECT * FROM notes
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [projectId, user.id],
    );
    const tasks = await pool.query<Task>(
      `SELECT * FROM tasks
       WHERE project_id = $1 AND user_id = $2
       ORDER BY status, created_at DESC`,
      [projectId, user.id],
    );
    const captures = await pool.query<Capture>(
      `SELECT DISTINCT c.*
       FROM captures c
       JOIN notes n ON n.capture_id = c.id
       WHERE n.project_id = $1 AND c.user_id = $2
       ORDER BY c.created_at DESC`,
      [projectId, user.id],
    );

    const serializedNotes = await Promise.all(
      notes.rows.map(async (note) => serializeNote(note, await getNoteTags(note.id))),
    );

    return apiJson({
      project: serializeProject(project.rows[0]),
      notes: serializedNotes,
      tasks: tasks.rows.map(serializeTask),
      captures: captures.rows.map(serializeCapture),
    });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const projectId = parseUuid(id, "project id");
    await ensureResourceOwner("projects", projectId, user.id);

    const body = await readJsonObject(request);
    const existing = await pool.query<Project>(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, user.id],
    );
    const project = existing.rows[0];
    const name = optionalString(body, "name");
    if (name === null) {
      throw apiError(400, "bad_request", "Le nom du projet ne peut pas etre vide.");
    }

    const type = optionalEnum(body, "type", PROJECT_TYPES);
    const status = optionalEnum(body, "status", PROJECT_STATUSES);
    const clientName = optionalString(body, "client_name");
    const description = optionalString(body, "description");

    const { rows } = await pool.query<Project>(
      `UPDATE projects
       SET name = $1, type = $2, status = $3, client_name = $4, description = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        name ?? project.name,
        type ?? project.type,
        status ?? project.status,
        clientName === undefined ? project.client_name : clientName,
        description === undefined ? project.description : description,
        projectId,
        user.id,
      ],
    );

    return apiJson({ project: serializeProject(rows[0]) });
  });
}
