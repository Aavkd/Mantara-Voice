import type { Capture, Note, Project, Task, UserSettings } from "@/lib/db/types";

type MaybeDate = Date | string | null;

function iso(value: MaybeDate): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

function dateOnly(value: MaybeDate): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return iso(value)?.slice(0, 10) ?? null;
}

export function serializeCapture(capture: Capture) {
  return {
    id: capture.id,
    input_type: capture.input_type,
    raw_transcript: capture.raw_transcript,
    processing_status: capture.processing_status,
    created_at: iso(capture.created_at),
    processed_at: iso(capture.processed_at),
  };
}

export function serializeNote(note: Note, tags: string[] = []) {
  return {
    id: note.id,
    project_id: note.project_id,
    capture_id: note.capture_id,
    title: note.title,
    body: note.body,
    ai_summary: note.ai_summary,
    status: note.status,
    accepted_by: note.accepted_by,
    confidence: note.confidence,
    tags,
    created_at: iso(note.created_at),
    updated_at: iso(note.updated_at),
  };
}

export function serializeTask(task: Task) {
  return {
    id: task.id,
    project_id: task.project_id,
    note_id: task.note_id,
    capture_id: task.capture_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: dateOnly(task.due_date),
    created_at: iso(task.created_at),
    updated_at: iso(task.updated_at),
    completed_at: iso(task.completed_at),
  };
}

export function serializeProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    type: project.type,
    client_name: project.client_name,
    description: project.description,
    status: project.status,
    created_at: iso(project.created_at),
    updated_at: iso(project.updated_at),
    last_activity_at: iso(project.last_activity_at),
  };
}

export function serializeSettings(settings: UserSettings) {
  return {
    id: settings.id,
    auto_validate_high_confidence: settings.auto_validate_high_confidence,
    manual_review_all_captures: settings.manual_review_all_captures,
    default_task_priority: settings.default_task_priority,
    created_at: iso(settings.created_at),
    updated_at: iso(settings.updated_at),
  };
}
