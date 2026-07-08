/**
 * Seed de developpement (SPEC_DESIGN.md phase 1).
 *
 * Cree un utilisateur de test avec ses reglages par defaut, les 3 projets des
 * maquettes (section 10.4.7) et un echantillon de captures / notes / taches /
 * tags illustrant les trois niveaux de confiance IA (forte / moyenne / faible).
 *
 * Idempotent : l'utilisateur de test est supprime (CASCADE) puis recree a
 * chaque execution.
 *
 *   pnpm db:seed
 */
import bcrypt from "bcryptjs";
import { connect } from "./_shared.mjs";

const TEST_EMAIL = "jean@mantara.co";
const TEST_PASSWORD = "mantara-dev"; // dev uniquement — remplace par un vrai compte en prod.

async function main() {
  const client = await connect();
  try {
    await client.query("BEGIN");

    // Repartir propre : supprimer l'utilisateur de test emporte ses donnees (CASCADE).
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [
      TEST_EMAIL,
    ]);

    const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users (email, name, password_hash, email_verified_at)
       VALUES ($1, $2, $3, now())
       RETURNING id`,
      [TEST_EMAIL, "Jean Mercier", passwordHash],
    );
    const userId = user.id;

    // Reglages par defaut explicites (== defauts colonne, mais on documente l'intention).
    await client.query(
      `INSERT INTO user_settings
         (user_id, auto_validate_high_confidence, manual_review_all_captures, default_task_priority)
       VALUES ($1, true, false, 'normal')`,
      [userId],
    );

    // --- Projets (maquettes 10.4.7) ---
    const projects = {};
    for (const p of [
      {
        key: "clientX",
        name: "Client X — Site vitrine",
        type: "client_project",
        client_name: "Studio X",
        status: "active",
        description: "Site vitrine pour le client X.",
      },
      {
        key: "studio",
        name: "Studio interne",
        type: "internal",
        client_name: null,
        status: "active",
        description: "Chantiers internes du studio.",
      },
      {
        key: "marque",
        name: "Refonte de marque",
        type: "internal",
        client_name: null,
        status: "paused",
        description: "Refonte de l'identite de marque.",
      },
    ]) {
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO projects (user_id, name, type, client_name, description, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, p.name, p.type, p.client_name, p.description, p.status],
      );
      projects[p.key] = row.id;
    }

    // --- Tags ---
    const tags = {};
    for (const name of ["devis", "relance", "marque", "idee"]) {
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id`,
        [userId, name],
      );
      tags[name] = row.id;
    }

    // Petit utilitaire : cree une capture + sa note + ses taches + ses tags.
    async function createCapture({
      inputType,
      transcript,
      note,
      taskList = [],
      tagList = [],
    }) {
      const {
        rows: [capture],
      } = await client.query(
        `INSERT INTO captures (user_id, input_type, raw_transcript, processing_status, processed_at)
         VALUES ($1, $2, $3, 'analyzed', now())
         RETURNING id`,
        [userId, inputType, transcript],
      );

      const {
        rows: [noteRow],
      } = await client.query(
        `INSERT INTO notes
           (user_id, project_id, capture_id, title, body, ai_summary, status, accepted_by, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          userId,
          note.projectId ?? null,
          capture.id,
          note.title,
          note.body,
          note.aiSummary ?? null,
          note.status,
          note.acceptedBy ?? null,
          note.confidence ?? null,
        ],
      );

      for (const tagName of tagList) {
        await client.query(`INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)`, [
          noteRow.id,
          tags[tagName],
        ]);
      }

      for (const t of taskList) {
        await client.query(
          `INSERT INTO tasks
             (user_id, project_id, note_id, capture_id, title, status, priority, due_date, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            note.projectId ?? null,
            noteRow.id,
            capture.id,
            t.title,
            t.status ?? "todo",
            t.priority ?? "normal",
            t.dueDate ?? null,
            t.status === "done" ? new Date().toISOString() : null,
          ],
        );
      }
      return { captureId: capture.id, noteId: noteRow.id };
    }

    // Forte confiance -> auto-validee par l'IA (accepted / ai), classee Client X.
    await createCapture({
      inputType: "voice",
      transcript:
        "euh… faut que je relance le client X pour le devis la, avant vendredi si possible, et voir si on ajuste le perimetre du site",
      note: {
        projectId: projects.clientX,
        title: "Relancer sur la validation du devis",
        body: "Relancer le client X au sujet de la validation du devis avant vendredi et verifier si le perimetre du site doit etre ajuste.",
        aiSummary: "Relance devis client X + ajustement perimetre.",
        status: "accepted",
        acceptedBy: "ai",
        confidence: 0.92,
      },
      taskList: [
        {
          title: "Relancer le client pour la validation du devis",
          priority: "high",
          dueDate: "2026-07-10",
        },
        { title: "Verifier le perimetre du site", priority: "normal" },
      ],
      tagList: ["devis", "relance"],
    });

    // Confiance moyenne -> reste dans l'Inbox, projet propose mais incertain.
    await createCapture({
      inputType: "text",
      transcript:
        "idee de palette plus chaude pour la marque, a rattacher quelque part",
      note: {
        projectId: projects.studio,
        title: "Refonte du systeme de couleurs",
        body: "Idee de palette plus chaude pour la marque. A rattacher — projet incertain.",
        status: "inbox",
        confidence: 0.61,
      },
      tagList: ["marque", "idee"],
    });

    // Confiance faible -> Inbox sans projet.
    await createCapture({
      inputType: "voice",
      transcript: "penser a reserver le studio photo",
      note: {
        projectId: null,
        title: "Penser a reserver le studio photo",
        body: "A classer manuellement.",
        status: "inbox",
        confidence: 0.28,
      },
    });

    // Quelques taches ouvertes supplementaires directement sur des projets.
    await client.query(
      `INSERT INTO tasks (user_id, project_id, title, status, priority, due_date)
       VALUES
         ($1, $2, 'Preparer la maquette de la page d''accueil', 'doing', 'normal', NULL),
         ($1, $2, 'Envoyer le devis final', 'todo', 'high', '2026-07-11'),
         ($1, $3, 'Cadrer le brief de refonte', 'todo', 'normal', NULL)`,
      [userId, projects.clientX, projects.marque],
    );

    await client.query("COMMIT");

    const counts = await client.query(
      `SELECT
         (SELECT count(*) FROM projects WHERE user_id = $1) AS projects,
         (SELECT count(*) FROM captures WHERE user_id = $1) AS captures,
         (SELECT count(*) FROM notes    WHERE user_id = $1) AS notes,
         (SELECT count(*) FROM tasks    WHERE user_id = $1) AS tasks,
         (SELECT count(*) FROM tags     WHERE user_id = $1) AS tags`,
      [userId],
    );
    const c = counts.rows[0];
    console.log("Seed OK.");
    console.log(`  utilisateur : ${TEST_EMAIL} (mot de passe dev : ${TEST_PASSWORD})`);
    console.log(
      `  projets=${c.projects} captures=${c.captures} notes=${c.notes} taches=${c.tasks} tags=${c.tags}`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ECHEC seed:", err.message);
  process.exit(1);
});
