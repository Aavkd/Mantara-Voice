import type { PoolClient } from "pg";
import { apiError } from "@/lib/api/responses";
import { analyzeCapture, InvalidAnalysisError } from "@/lib/ai";
import type { AnalysisResult, AnalyzedTask } from "@/lib/ai";
import { ensureResourceOwner } from "@/lib/api/ownership";
import { pool } from "@/lib/db/client";
import type {
  Capture,
  CaptureInputType,
  Note,
  Project,
  Task,
  TaskPriority,
  UserSettings,
} from "@/lib/db/types";

type Queryable = Pick<PoolClient, "query">;

export type CaptureAnalysisBundle = {
  capture: Capture;
  note: Note;
  tasks: Task[];
  tags: string[];
  analysis: AnalysisResult;
  auto_validated: boolean;
};

export type CaptureBundle = {
  capture: Capture;
  note: Note | null;
  tasks: Task[];
  tags: string[];
};

const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new InvalidAnalysisError(`${label} doit etre une chaine.`);
  }
  return value;
}

function assertBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new InvalidAnalysisError(`${label} doit etre un booleen.`);
  }
  return value;
}

function validateAnalysisResult(value: unknown): AnalysisResult {
  if (!isObject(value)) {
    throw new InvalidAnalysisError("La sortie IA doit etre un objet.");
  }

  const projectMatchValue = value.project_match;
  let project_match: AnalysisResult["project_match"] = null;
  if (projectMatchValue !== null) {
    if (!isObject(projectMatchValue)) {
      throw new InvalidAnalysisError("project_match doit etre un objet ou null.");
    }
    const confidence = projectMatchValue.confidence;
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      throw new InvalidAnalysisError("project_match.confidence doit etre entre 0 et 1.");
    }
    project_match = {
      project_id:
        projectMatchValue.project_id === null
          ? null
          : assertString(projectMatchValue.project_id, "project_match.project_id"),
      project_name:
        projectMatchValue.project_name === null
          ? null
          : assertString(projectMatchValue.project_name, "project_match.project_name"),
      confidence,
      reason: assertString(projectMatchValue.reason, "project_match.reason"),
    };
  }

  const tasksValue = value.tasks;
  if (!Array.isArray(tasksValue)) {
    throw new InvalidAnalysisError("tasks doit etre une liste.");
  }
  const tasks: AnalyzedTask[] = tasksValue.map((task, index) => {
    if (!isObject(task)) {
      throw new InvalidAnalysisError(`tasks[${index}] doit etre un objet.`);
    }
    const priority = task.priority;
    if (typeof priority !== "string" || !TASK_PRIORITIES.includes(priority as TaskPriority)) {
      throw new InvalidAnalysisError(`tasks[${index}].priority est invalide.`);
    }
    const dueDate = task.due_date;
    if (
      dueDate !== null &&
      (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
    ) {
      throw new InvalidAnalysisError(`tasks[${index}].due_date est invalide.`);
    }
    return {
      title: assertString(task.title, `tasks[${index}].title`).trim(),
      due_date: dueDate,
      priority: priority as TaskPriority,
    };
  });

  const tagsValue = value.tags;
  if (!Array.isArray(tagsValue) || tagsValue.some((tag) => typeof tag !== "string")) {
    throw new InvalidAnalysisError("tags doit etre une liste de chaines.");
  }

  return {
    title: assertString(value.title, "title").trim(),
    clean_note: assertString(value.clean_note, "clean_note").trim(),
    project_match,
    suggest_create_project: assertBoolean(
      value.suggest_create_project,
      "suggest_create_project",
    ),
    tasks: tasks.filter((task) => task.title.length > 0),
    tags: [...new Set(tagsValue.map((tag) => tag.trim()).filter(Boolean))],
    needs_review: assertBoolean(value.needs_review, "needs_review"),
  };
}

async function getOrCreateSettings(userId: string, db: Queryable = pool): Promise<UserSettings> {
  const existing = await db.query<UserSettings>(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await db.query<UserSettings>(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     RETURNING *`,
    [userId],
  );
  return created.rows[0];
}

async function listProjectsForAnalysis(userId: string): Promise<Project[]> {
  const { rows } = await pool.query<Project>(
    `SELECT * FROM projects WHERE user_id = $1 ORDER BY last_activity_at DESC`,
    [userId],
  );
  return rows;
}

async function listRecentNotes(userId: string): Promise<Array<{ title: string; body: string }>> {
  const { rows } = await pool.query<{ title: string; body: string }>(
    `SELECT title, body
     FROM notes
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId],
  );
  return rows;
}

async function listKnownTags(userId: string): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM tags WHERE user_id = $1 ORDER BY name`,
    [userId],
  );
  return rows.map((row) => row.name);
}

function findOwnedProject(projects: Project[], projectId: string | null | undefined): Project | null {
  if (!projectId) {
    return null;
  }
  return projects.find((project) => project.id === projectId) ?? null;
}

function shouldAutoValidate(
  settings: UserSettings,
  analysis: AnalysisResult,
  matchedProject: Project | null,
): boolean {
  return (
    settings.auto_validate_high_confidence === true &&
    settings.manual_review_all_captures === false &&
    (analysis.project_match?.confidence ?? 0) >= 0.8 &&
    !!matchedProject &&
    analysis.suggest_create_project === false &&
    analysis.needs_review === false &&
    analysis.title.trim().length > 0 &&
    analysis.clean_note.trim().length > 0
  );
}

function proposedProjectId(analysis: AnalysisResult, matchedProject: Project | null): string | null {
  if (!matchedProject || analysis.suggest_create_project) {
    return null;
  }
  return (analysis.project_match?.confidence ?? 0) >= 0.5 ? matchedProject.id : null;
}

async function getOrCreateTagId(
  client: PoolClient,
  userId: string,
  name: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM tags WHERE user_id = $1 AND lower(name) = lower($2)`,
    [userId, name],
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `INSERT INTO tags (user_id, name)
     VALUES ($1, $2)
     RETURNING id`,
    [userId, name],
  );
  return created.rows[0].id;
}

async function attachTags(
  client: PoolClient,
  userId: string,
  noteId: string,
  tags: string[],
): Promise<void> {
  const uniqueTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  for (const tag of uniqueTags) {
    const tagId = await getOrCreateTagId(client, userId, tag);
    await client.query(
      `INSERT INTO note_tags (note_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [noteId, tagId],
    );
  }
}

async function getTagsForNote(noteId: string): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT t.name
     FROM tags t
     JOIN note_tags nt ON nt.tag_id = t.id
     WHERE nt.note_id = $1
     ORDER BY t.name`,
    [noteId],
  );
  return rows.map((row) => row.name);
}

async function insertTasks(
  client: PoolClient,
  userId: string,
  captureId: string,
  noteId: string,
  projectId: string | null,
  tasks: AnalyzedTask[],
  defaultPriority: TaskPriority,
): Promise<Task[]> {
  const created: Task[] = [];
  for (const task of tasks) {
    const { rows } = await client.query<Task>(
      `INSERT INTO tasks
         (user_id, project_id, note_id, capture_id, title, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7)
       RETURNING *`,
      [
        userId,
        projectId,
        noteId,
        captureId,
        task.title,
        task.priority ?? defaultPriority,
        task.due_date,
      ],
    );
    created.push(rows[0]);
  }
  return created;
}

export async function createCapture(
  userId: string,
  inputType: CaptureInputType,
  rawTranscript: string | null,
): Promise<Capture> {
  const { rows } = await pool.query<Capture>(
    `INSERT INTO captures (user_id, input_type, raw_transcript, processing_status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, inputType, rawTranscript],
  );
  return rows[0];
}

export async function markCaptureError(captureId: string): Promise<Capture> {
  const { rows } = await pool.query<Capture>(
    `UPDATE captures
     SET processing_status = 'error', processed_at = now()
     WHERE id = $1
     RETURNING *`,
    [captureId],
  );
  return rows[0];
}

export async function analyzePersistedCapture(
  userId: string,
  captureId: string,
): Promise<CaptureAnalysisBundle> {
  await ensureResourceOwner("captures", captureId, userId);

  const captureResult = await pool.query<Capture>(
    `SELECT * FROM captures WHERE id = $1 AND user_id = $2`,
    [captureId, userId],
  );
  const capture = captureResult.rows[0];
  const transcript = capture.raw_transcript?.trim();
  if (!transcript) {
    await markCaptureError(captureId);
    throw apiError(
      422,
      "transcription_unavailable",
      "Aucune transcription exploitable n'est disponible pour cette capture.",
    );
  }

  await pool.query(
    `UPDATE captures
     SET processing_status = 'analyzing', processed_at = NULL
     WHERE id = $1 AND user_id = $2`,
    [captureId, userId],
  );

  let analysis: AnalysisResult;
  try {
    const projects = await listProjectsForAnalysis(userId);
    analysis = validateAnalysisResult(
      await analyzeCapture({
        raw_transcript: transcript,
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          client_name: project.client_name,
        })),
        recent_notes: await listRecentNotes(userId),
        known_tags: await listKnownTags(userId),
      }),
    );
  } catch (error) {
    await markCaptureError(captureId);
    if (error instanceof InvalidAnalysisError) {
      throw apiError(422, "invalid_ai_json", error.message);
    }
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const projects = await client.query<Project>(
      `SELECT * FROM projects WHERE user_id = $1`,
      [userId],
    );
    const matchedProject = findOwnedProject(
      projects.rows,
      analysis.project_match?.project_id,
    );
    const settings = await getOrCreateSettings(userId, client);
    const autoValidated = shouldAutoValidate(settings, analysis, matchedProject);
    const projectId = autoValidated
      ? matchedProject?.id ?? null
      : proposedProjectId(analysis, matchedProject);
    const status = autoValidated ? "accepted" : "inbox";
    const acceptedBy = autoValidated ? "ai" : null;

    await client.query(`DELETE FROM tasks WHERE user_id = $1 AND capture_id = $2`, [
      userId,
      captureId,
    ]);
    await client.query(`DELETE FROM notes WHERE user_id = $1 AND capture_id = $2`, [
      userId,
      captureId,
    ]);

    const noteResult = await client.query<Note>(
      `INSERT INTO notes
         (user_id, project_id, capture_id, title, body, ai_summary, status, accepted_by, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        projectId,
        captureId,
        analysis.title,
        analysis.clean_note,
        analysis.project_match?.reason ?? null,
        status,
        acceptedBy,
        analysis.project_match?.confidence ?? null,
      ],
    );
    const note = noteResult.rows[0];

    await attachTags(client, userId, note.id, analysis.tags);
    const tasks = await insertTasks(
      client,
      userId,
      captureId,
      note.id,
      projectId,
      analysis.tasks,
      settings.default_task_priority,
    );

    const updatedCapture = await client.query<Capture>(
      `UPDATE captures
       SET processing_status = 'analyzed', processed_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [captureId, userId],
    );

    if (autoValidated && projectId) {
      await client.query(
        `UPDATE projects SET last_activity_at = now() WHERE id = $1 AND user_id = $2`,
        [projectId, userId],
      );
    }

    await client.query("COMMIT");

    return {
      capture: updatedCapture.rows[0],
      note,
      tasks,
      tags: analysis.tags,
      analysis,
      auto_validated: autoValidated,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await markCaptureError(captureId);
    throw error;
  } finally {
    client.release();
  }
}

export async function createAndAnalyzeCapture(
  userId: string,
  inputType: CaptureInputType,
  rawTranscript: string,
): Promise<CaptureAnalysisBundle> {
  const capture = await createCapture(userId, inputType, rawTranscript);
  return analyzePersistedCapture(userId, capture.id);
}

export async function getCaptureBundle(
  userId: string,
  captureId: string,
): Promise<CaptureBundle> {
  await ensureResourceOwner("captures", captureId, userId);

  const captureResult = await pool.query<Capture>(
    `SELECT * FROM captures WHERE id = $1 AND user_id = $2`,
    [captureId, userId],
  );
  const noteResult = await pool.query<Note>(
    `SELECT * FROM notes WHERE capture_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [captureId, userId],
  );
  const taskResult = await pool.query<Task>(
    `SELECT * FROM tasks WHERE capture_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
    [captureId, userId],
  );
  const note = noteResult.rows[0] ?? null;

  return {
    capture: captureResult.rows[0],
    note,
    tasks: taskResult.rows,
    tags: note ? await getTagsForNote(note.id) : [],
  };
}

export async function getNoteTags(noteId: string): Promise<string[]> {
  return getTagsForNote(noteId);
}

export async function replaceNoteTags(
  client: PoolClient,
  userId: string,
  noteId: string,
  tags: string[],
): Promise<void> {
  await client.query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);
  await attachTags(client, userId, noteId, tags);
}
