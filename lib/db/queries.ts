/**
 * Acces base scope par utilisateur (SPEC_DESIGN.md section 9.4).
 *
 * Regle non negociable : CHAQUE fonction prend `userId` et filtre dessus dans
 * la clause WHERE. Aucune lecture/ecriture ne doit pouvoir traverser la
 * frontiere d'un utilisateur. Ces helpers seront consommes par les routes API
 * (phase 2) ; ils centralisent le scoping pour eviter de l'oublier route par
 * route. Le test tests/scoping.mjs verifie cette isolation sur la base seedee.
 */
import { pool } from "./client";
import type { Note, Project, Task, UserSettings } from "./types";

/** Preferences de l'utilisateur (une ligne par user). */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { rows } = await pool.query<UserSettings>(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Projets de l'utilisateur, actifs d'abord, puis par activite recente. */
export async function listProjects(userId: string): Promise<Project[]> {
  const { rows } = await pool.query<Project>(
    `SELECT * FROM projects
     WHERE user_id = $1
     ORDER BY last_activity_at DESC`,
    [userId],
  );
  return rows;
}

/** Un projet precis — null s'il n'existe pas OU appartient a un autre user. */
export async function getProject(
  userId: string,
  projectId: string,
): Promise<Project | null> {
  const { rows } = await pool.query<Project>(
    `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return rows[0] ?? null;
}

/** Notes en attente de validation (Inbox), triees par date. */
export async function listInboxNotes(userId: string): Promise<Note[]> {
  const { rows } = await pool.query<Note>(
    `SELECT * FROM notes
     WHERE user_id = $1 AND status = 'inbox'
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

/** Une note precise, scopee a l'utilisateur. */
export async function getNote(userId: string, noteId: string): Promise<Note | null> {
  const { rows } = await pool.query<Note>(
    `SELECT * FROM notes WHERE id = $1 AND user_id = $2`,
    [noteId, userId],
  );
  return rows[0] ?? null;
}

/** Taches de l'utilisateur, optionnellement filtrees par statut. */
export async function listTasks(
  userId: string,
  opts: { status?: Task["status"] } = {},
): Promise<Task[]> {
  if (opts.status) {
    const { rows } = await pool.query<Task>(
      `SELECT * FROM tasks
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC`,
      [userId, opts.status],
    );
    return rows;
  }
  const { rows } = await pool.query<Task>(
    `SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}
