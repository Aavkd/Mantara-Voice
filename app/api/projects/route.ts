import { apiJson, runApi } from "@/lib/api/responses";
import { serializeProject } from "@/lib/api/serializers";
import {
  optionalEnum,
  optionalString,
  readJsonObject,
  requiredString,
} from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";
import type { Project, ProjectStatus, ProjectType } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_TYPES: ProjectType[] = [
  "client_project",
  "internal",
  "opportunity",
  "technical",
  "personal",
  "other",
];
const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "archived", "completed"];

type ProjectListRow = Project & {
  open_task_count: number;
  note_count: number;
};

export async function GET() {
  return runApi(async () => {
    const user = await requireSession();
    const { rows } = await pool.query<ProjectListRow>(
      `SELECT
         p.*,
         count(DISTINCT tk.id) FILTER (WHERE tk.status <> 'done')::int AS open_task_count,
         count(DISTINCT n.id)::int AS note_count
       FROM projects p
       LEFT JOIN tasks tk ON tk.project_id = p.id AND tk.user_id = p.user_id
       LEFT JOIN notes n ON n.project_id = p.id AND n.user_id = p.user_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.last_activity_at DESC`,
      [user.id],
    );

    return apiJson({
      projects: rows.map((row) => ({
        ...serializeProject(row),
        open_task_count: row.open_task_count,
        note_count: row.note_count,
      })),
    });
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    const body = await readJsonObject(request);
    const name = requiredString(body, "name", "Le nom du projet est requis.");
    const type = optionalEnum(body, "type", PROJECT_TYPES) ?? "other";
    const status = optionalEnum(body, "status", PROJECT_STATUSES) ?? "active";
    const clientName = optionalString(body, "client_name") ?? null;
    const description = optionalString(body, "description") ?? null;

    const { rows } = await pool.query<Project>(
      `INSERT INTO projects (user_id, name, type, client_name, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, name, type, clientName, description, status],
    );

    return apiJson({ project: serializeProject(rows[0]) }, 201);
  });
}
