import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectSearchRow = {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
};

type NoteSearchRow = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  body: string;
  raw_transcript: string | null;
};

type TaskSearchRow = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  description: string | null;
};

function matchingFields(
  fields: Record<string, string | null>,
  term: string,
): Array<{ field: string; value: string }> {
  const lowerTerm = term.toLowerCase();
  return Object.entries(fields)
    .filter(([, value]) => value?.toLowerCase().includes(lowerTerm))
    .map(([field, value]) => ({ field, value: value ?? "" }));
}

function snippet(fields: Array<{ value: string }>, term: string): string {
  const match = fields.find((field) => field.value.toLowerCase().includes(term.toLowerCase()));
  const value = match?.value ?? fields[0]?.value ?? "";
  const index = value.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) {
    return value.slice(0, 180);
  }
  const start = Math.max(0, index - 60);
  const end = Math.min(value.length, index + term.length + 90);
  return `${start > 0 ? "..." : ""}${value.slice(start, end)}${end < value.length ? "..." : ""}`;
}

export async function GET(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    if (!q) {
      throw apiError(400, "bad_request", "Le parametre q est requis.");
    }

    const pattern = `%${q}%`;
    const [projects, notes, tasks] = await Promise.all([
      pool.query<ProjectSearchRow>(
        `SELECT id, name, client_name, description
         FROM projects
         WHERE user_id = $1
           AND (name ILIKE $2 OR client_name ILIKE $2 OR description ILIKE $2)
         ORDER BY last_activity_at DESC
         LIMIT 10`,
        [user.id, pattern],
      ),
      pool.query<NoteSearchRow>(
        `SELECT
           n.id,
           n.project_id,
           p.name AS project_name,
           n.title,
           n.body,
           c.raw_transcript
         FROM notes n
         LEFT JOIN projects p ON p.id = n.project_id AND p.user_id = n.user_id
         LEFT JOIN captures c ON c.id = n.capture_id AND c.user_id = n.user_id
         WHERE n.user_id = $1
           AND (n.title ILIKE $2 OR n.body ILIKE $2 OR c.raw_transcript ILIKE $2)
         ORDER BY n.created_at DESC
         LIMIT 10`,
        [user.id, pattern],
      ),
      pool.query<TaskSearchRow>(
        `SELECT
           tk.id,
           tk.project_id,
           p.name AS project_name,
           tk.title,
           tk.description
         FROM tasks tk
         LEFT JOIN projects p ON p.id = tk.project_id AND p.user_id = tk.user_id
         WHERE tk.user_id = $1
           AND (tk.title ILIKE $2 OR tk.description ILIKE $2)
         ORDER BY tk.created_at DESC
         LIMIT 10`,
        [user.id, pattern],
      ),
    ]);

    const projectResults = projects.rows.map((project) => {
      const matches = matchingFields(
        {
          name: project.name,
          client_name: project.client_name,
          description: project.description,
        },
        q,
      );
      return {
        type: "project" as const,
        id: project.id,
        title: project.name,
        project_id: project.id,
        project_name: project.name,
        snippet: snippet(matches, q),
        matches,
      };
    });

    const noteResults = notes.rows.map((note) => {
      const matches = matchingFields(
        {
          title: note.title,
          body: note.body,
          raw_transcript: note.raw_transcript,
        },
        q,
      );
      return {
        type: "note" as const,
        id: note.id,
        title: note.title,
        project_id: note.project_id,
        project_name: note.project_name,
        snippet: snippet(matches, q),
        matches,
      };
    });

    const taskResults = tasks.rows.map((task) => {
      const matches = matchingFields(
        {
          title: task.title,
          description: task.description,
        },
        q,
      );
      return {
        type: "task" as const,
        id: task.id,
        title: task.title,
        project_id: task.project_id,
        project_name: task.project_name,
        snippet: snippet(matches, q),
        matches,
      };
    });

    return apiJson({
      query: q,
      results: [...taskResults, ...noteResults, ...projectResults],
    });
  });
}
