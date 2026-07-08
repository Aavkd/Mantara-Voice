/**
 * Suite API phase 2 : contrat backend sans frontend.
 *
 * Prerequis :
 *   pnpm db:reset:all
 *   pnpm dev
 *
 * Usage :
 *   node tests/api-phase2.mjs
 *   BASE_URL=http://localhost:3001 node tests/api-phase2.mjs
 */

import { randomUUID } from "node:crypto";
import { connect } from "../scripts/_shared.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "jean@mantara.co";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "mantara-dev";

class CookieJar {
  #cookies = new Map();

  apply(headers) {
    const getSetCookie = headers.getSetCookie?.bind(headers);
    const values = getSetCookie ? getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
    for (const value of values) {
      const [pair] = value.split(";");
      const index = pair.indexOf("=");
      if (index > 0) {
        this.#cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    }
  }

  header() {
    return [...this.#cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

const jar = new CookieJar();
let failures = 0;

function check(label, condition, details = "") {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`  FAIL ${label}${details ? ` -- ${details}` : ""}`);
    failures++;
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookie = jar.header();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: "manual",
  });
  jar.apply(res.headers);
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { res, body };
}

async function json(path, method, body) {
  return request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function login() {
  const csrf = await request("/api/auth/csrf", {
    headers: { accept: "application/json" },
  });
  check("Auth.js expose un csrfToken", csrf.res.status === 200 && !!csrf.body?.csrfToken);

  const form = new URLSearchParams({
    csrfToken: csrf.body.csrfToken,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    callbackUrl: BASE_URL,
    json: "true",
  });
  const signIn = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: form.toString(),
  });
  check(
    "connexion credentials Auth.js",
    [200, 302].includes(signIn.res.status),
    `status=${signIn.res.status} body=${JSON.stringify(signIn.body)}`,
  );

  const session = await request("/api/auth/session", {
    headers: { accept: "application/json" },
  });
  check(
    "session Auth.js active",
    session.res.status === 200 && !!session.body?.user?.email,
    `status=${session.res.status} body=${JSON.stringify(session.body)}`,
  );
}

async function createForeignProject() {
  const client = await connect();
  const suffix = randomUUID().slice(0, 8);
  const email = `phase2-other-${suffix}@example.test`;
  try {
    await client.query("BEGIN");
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users (email, name) VALUES ($1, 'Other User') RETURNING id`,
      [email],
    );
    const {
      rows: [project],
    } = await client.query(
      `INSERT INTO projects (user_id, name) VALUES ($1, 'Projet autre utilisateur') RETURNING id`,
      [user.id],
    );
    await client.query("COMMIT");
    return { email, projectId: project.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanupForeignUser(email) {
  const client = await connect();
  try {
    await client.query(`DELETE FROM users WHERE email = $1`, [email]);
  } finally {
    await client.end();
  }
}

async function cleanupProject(projectId) {
  const client = await connect();
  try {
    await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log(`API phase 2 sur ${BASE_URL}`);
  let foreignUserEmail = null;
  let createdProjectId = null;

  const unauthorized = await request("/api/projects");
  check("route protegee renvoie 401 sans session", unauthorized.res.status === 401);

  await login();

  const foreign = await createForeignProject();
  foreignUserEmail = foreign.email;
  const forbidden = await request(`/api/projects/${foreign.projectId}`);
  check("ressource d'un autre utilisateur renvoie 403", forbidden.res.status === 403);

  const projects = await request("/api/projects");
  check("GET /api/projects", projects.res.status === 200 && projects.body.projects.length >= 3);
  const clientProject = projects.body.projects.find((project) =>
    project.name.toLowerCase().includes("client x"),
  );
  check("seed contient le projet Client X", !!clientProject);

  const strong = await json("/api/captures/text", "POST", {
    text: "faut que je relance le client X pour le devis avant vendredi et revoir le site vitrine",
  });
  check("capture forte confiance creee", strong.res.status === 201);
  check(
    "capture forte auto-validee",
    strong.body.auto_validated === true &&
      strong.body.note.status === "accepted" &&
      strong.body.note.accepted_by === "ai" &&
      strong.body.tasks.length === 2,
  );

  const medium = await json("/api/captures/text", "POST", {
    text: "idee de palette plus chaude pour la marque, a rattacher quelque part",
  });
  check("capture moyenne creee", medium.res.status === 201);
  check(
    "capture moyenne reste en Inbox",
    medium.body.auto_validated === false && medium.body.note.status === "inbox",
  );

  const patched = await json(`/api/notes/${medium.body.note.id}`, "PATCH", {
    title: "Palette plus chaude pour la marque",
    project_id: clientProject.id,
    tags: ["marque", "idee"],
    tasks: [
      {
        title: "Preparer une piste de palette chaude",
        priority: "normal",
        status: "todo",
        due_date: null,
      },
    ],
  });
  check("PATCH /api/notes/:id", patched.res.status === 200);

  const accepted = await json(`/api/notes/${medium.body.note.id}/accept`, "POST", {
    project_id: clientProject.id,
  });
  check(
    "POST /api/notes/:id/accept",
    accepted.res.status === 200 &&
      accepted.body.note.status === "accepted" &&
      accepted.body.note.accepted_by === "user",
  );

  const projectDetail = await request(`/api/projects/${clientProject.id}`);
  check(
    "note validee retrouvee dans le projet",
    projectDetail.res.status === 200 &&
      projectDetail.body.notes.some((note) => note.id === medium.body.note.id),
  );

  const search = await request("/api/search?q=devis");
  check(
    "recherche inclut notes/transcriptions",
    search.res.status === 200 &&
      search.body.results.some((result) =>
        result.matches.some((match) => match.field === "raw_transcript"),
      ),
  );

  const zeroTask = await json("/api/captures/text", "POST", {
    text: "note contexte pour memoire sur le studio interne, aucune tache",
  });
  check(
    "capture sans tache detectee",
    zeroTask.res.status === 201 && zeroTask.body.tasks.length === 0,
  );

  const newProject = await json("/api/captures/text", "POST", {
    text: "nouveau projet pour une nouvelle opportunite de refonte e-commerce",
  });
  check(
    "suggestion nouveau projet reste en Inbox",
    newProject.res.status === 201 &&
      newProject.body.note.status === "inbox" &&
      newProject.body.analysis.suggest_create_project === true,
  );

  const invalid = await json("/api/captures/text", "POST", {
    text: "__invalid_json__",
  });
  check(
    "JSON IA invalide renvoie 422",
    invalid.res.status === 422 && invalid.body.error.code === "invalid_ai_json",
  );

  const otherUserProject = await json("/api/projects", "POST", {
    name: "Projet temporaire phase 2",
    type: "internal",
  });
  check("creation projet", otherUserProject.res.status === 201);
  createdProjectId = otherUserProject.body?.project?.id ?? null;

  if (failures > 0) {
    if (createdProjectId) {
      await cleanupProject(createdProjectId);
    }
    if (foreignUserEmail) {
      await cleanupForeignUser(foreignUserEmail);
    }
    console.error(`\nECHEC: ${failures} verification(s) phase 2 en echec.`);
    process.exit(1);
  }
  console.log("\nOK: contrat API phase 2 verifie.");

  if (createdProjectId) {
    await cleanupProject(createdProjectId);
  }
  if (foreignUserEmail) {
    await cleanupForeignUser(foreignUserEmail);
  }
}

main().catch((err) => {
  console.error("ECHEC suite API phase 2:", err);
  process.exit(1);
});
