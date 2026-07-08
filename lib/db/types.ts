/**
 * Types de lignes correspondant au schema Postgres (db/migrations/0001_init.sql,
 * SPEC_DESIGN.md section 8). Les dates sont renvoyees en `Date` par le driver
 * `pg` ; les colonnes `date` (ex. `due_date`) reviennent en `Date` egalement.
 *
 * Ces types servent de contrat cote backend. Ils ne sont jamais exposes tels
 * quels au frontend : les routes API (phase 2) les serialisent selon le
 * contrat de la section 9.5 (ISO 8601, UUID).
 */

export type ProjectType =
  "client_project" | "internal" | "opportunity" | "technical" | "personal" | "other";
export type ProjectStatus = "active" | "paused" | "archived" | "completed";
export type CaptureInputType = "voice" | "text";
export type CaptureProcessingStatus =
  "pending" | "transcribing" | "analyzing" | "analyzed" | "error";
export type NoteStatus = "inbox" | "accepted" | "archived";
export type NoteAcceptedBy = "user" | "ai";
export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type User = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  email_verified_at: Date | null;
  created_at: Date;
};

export type UserSettings = {
  id: string;
  user_id: string;
  auto_validate_high_confidence: boolean;
  manual_review_all_captures: boolean;
  default_task_priority: TaskPriority;
  created_at: Date;
  updated_at: Date;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  type: ProjectType;
  client_name: string | null;
  description: string | null;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
};

export type Capture = {
  id: string;
  user_id: string;
  input_type: CaptureInputType;
  raw_transcript: string | null;
  processing_status: CaptureProcessingStatus;
  created_at: Date;
  processed_at: Date | null;
};

export type Note = {
  id: string;
  user_id: string;
  project_id: string | null;
  capture_id: string | null;
  title: string;
  body: string;
  ai_summary: string | null;
  status: NoteStatus;
  accepted_by: NoteAcceptedBy | null;
  confidence: number | null;
  created_at: Date;
  updated_at: Date;
};

export type Task = {
  id: string;
  user_id: string;
  project_id: string | null;
  note_id: string | null;
  capture_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: Date;
};
