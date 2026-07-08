/**
 * Critere d'acceptation phase 1 : un utilisateur ne lit/ecrit que ses propres
 * lignes (scoping applicatif par `user_id`, SPEC_DESIGN.md section 9.4).
 *
 * Ce test cree deux utilisateurs jetables (A et B), donne un projet a chacun,
 * puis verifie via les memes requetes scopees que les routes utiliseront
 * (WHERE ... AND user_id = $1) que :
 *   - lister les projets de A ne renvoie QUE le projet de A ;
 *   - lire le projet de B avec l'id de A renvoie 0 ligne (== 404/403 cote API) ;
 *   - une mise a jour scopee sur le projet de B avec l'id de A n'affecte rien.
 * Verifie aussi que les reglages du seed correspondent aux defauts (7.6 / 9.5).
 *
 * Prerequis : base migree + seedee (`pnpm db:reset:all`). N'altère pas le seed
 * (ses deux users temporaires sont supprimes en fin de test).
 *
 *   pnpm test:scoping
 */
import { randomUUID } from "node:crypto";
import { connect } from "../scripts/_shared.mjs";

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`  FAIL ${label}`);
    failures++;
  }
}

async function main() {
  const client = await connect();
  const suffix = randomUUID().slice(0, 8);
  const emailA = `scoping-a-${suffix}@example.test`;
  const emailB = `scoping-b-${suffix}@example.test`;

  try {
    // --- Fixtures : deux utilisateurs, un projet chacun ---
    const {
      rows: [a],
    } = await client.query(
      `INSERT INTO users (email, name) VALUES ($1, 'User A') RETURNING id`,
      [emailA],
    );
    const {
      rows: [b],
    } = await client.query(
      `INSERT INTO users (email, name) VALUES ($1, 'User B') RETURNING id`,
      [emailB],
    );

    const {
      rows: [projA],
    } = await client.query(
      `INSERT INTO projects (user_id, name) VALUES ($1, 'Projet de A') RETURNING id`,
      [a.id],
    );
    const {
      rows: [projB],
    } = await client.query(
      `INSERT INTO projects (user_id, name) VALUES ($1, 'Projet de B') RETURNING id`,
      [b.id],
    );

    // --- Lecture scopee : A ne voit que ses projets ---
    const listA = await client.query(`SELECT id FROM projects WHERE user_id = $1`, [
      a.id,
    ]);
    check(
      "listProjects(A) ne renvoie que le projet de A",
      listA.rows.length === 1 && listA.rows[0].id === projA.id,
    );

    // --- Acces croise interdit : lire le projet de B avec l'id de A ---
    const crossRead = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [projB.id, a.id],
    );
    check(
      "getProject(A, projetB) renvoie 0 ligne (403/404 cote API)",
      crossRead.rowCount === 0,
    );

    // --- Ecriture croisee interdite : A ne peut pas modifier le projet de B ---
    const crossWrite = await client.query(
      `UPDATE projects SET name = 'pirate' WHERE id = $1 AND user_id = $2`,
      [projB.id, a.id],
    );
    check(
      "UPDATE scope (A sur projetB) n'affecte aucune ligne",
      crossWrite.rowCount === 0,
    );
    const untouched = await client.query(`SELECT name FROM projects WHERE id = $1`, [
      projB.id,
    ]);
    check(
      "le projet de B est intact apres tentative d'ecriture croisee",
      untouched.rows[0]?.name === "Projet de B",
    );

    // --- Defauts UserSettings du seed (sections 7.6 / 9.5) ---
    const settings = await client.query(
      `SELECT s.auto_validate_high_confidence, s.manual_review_all_captures, s.default_task_priority
       FROM user_settings s
       JOIN users u ON u.id = s.user_id
       WHERE lower(u.email) = 'jean@mantara.co'`,
    );
    const s = settings.rows[0];
    check(
      "UserSettings du seed = defauts (auto-valid=true, manual=false, priorite=normal)",
      !!s &&
        s.auto_validate_high_confidence === true &&
        s.manual_review_all_captures === false &&
        s.default_task_priority === "normal",
    );
  } finally {
    // Nettoyage : supprimer les users jetables (CASCADE emporte leurs projets).
    await client.query(`DELETE FROM users WHERE email IN ($1, $2)`, [emailA, emailB]);
    await client.end();
  }

  if (failures > 0) {
    console.error(`\nECHEC: ${failures} verification(s) de scoping en echec.`);
    process.exit(1);
  }
  console.log("\nOK: scoping user_id verifie.");
}

main().catch((err) => {
  console.error("ECHEC test scoping:", err.message);
  process.exit(1);
});
