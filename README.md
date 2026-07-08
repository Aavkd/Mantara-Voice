# Mantara Voice Inbox

Application web qui transforme une dictee vocale en note structuree, taches et
classement par projet. Voir [`SPEC_DESIGN.md`](./SPEC_DESIGN.md) pour la
specification produit et technique complete.

Strategie : **backend / API d'abord, frontend ensuite** (spec section 13).

## Stack

- **TypeScript** partout · **Next.js** (App Router) — backend dans `app/api/**`.
- **PostgreSQL** auto-heberge (dev : via Docker).
- **Auth.js** (email + mot de passe, bcrypt) — phase 2.
- **IA** : Whisper local (STT) + Claude (`ANTHROPIC_MODEL`) — phase 3.
- Hebergement cible : frontend sur Vercel, backend + base + IA sur la machine
  Mantara, exposes via tunnel Cloudflare.

## Etat : Phase 3 - IA reelle en cours

- [x] Phase 0 (fondations) : Next.js + TS, ESLint/Prettier, `.env`, structure,
      Postgres (Docker), `GET /api/health`, modele de tunnel Cloudflare.
- [x] Schema Postgres complet (spec section 8) via migration SQL versionnee
      (`db/migrations/0001_init.sql`) : users, user_settings, projects,
      captures, notes, tasks, tags, note_tags. Enums + contraintes, `updated_at`
      par trigger, FK `user_id` partout (`ON DELETE CASCADE`).
- [x] Runner de migrations idempotent (`pnpm db:migrate`) + reset (`pnpm db:reset`).
- [x] Seed de dev (`pnpm db:seed`) : utilisateur test, reglages par defaut,
      3 projets des maquettes, captures/notes/taches/tags (confiance forte /
      moyenne / faible).
- [x] Helpers d'acces typés scopés `user_id` (`lib/db/queries.ts`) + test de
      scoping (`pnpm test:scoping`).
- [x] Auth.js credentials (email + mot de passe bcrypt) + routes protegees par
      session cookie.
- [x] Routes API phase 2 : captures texte/audio mock, analyse/reanalyse,
      Inbox, notes, projets, taches, recherche, reglages.
- [x] Mock IA deterministe couvrant confiance forte/moyenne/faible, nouveau
      projet, zero tache et JSON IA invalide.
- [x] Regle d'auto-validation backend (section 7.6) appliquee cote serveur.
- [x] Suite API sans frontend (`pnpm test:api`).
- [x] Analyse Claude branchee derriere `analyzeCapture()` avec sortie JSON
      schemaisee (`output_config.format`) et contexte projets/clients/notes/tags.
- [x] Route `POST /api/captures/audio` branchee sur Whisper local via
      `transcribe()` ; l'audio passe par un dossier temporaire supprime en fin
      de traitement.
- [x] Fallback dev/test : sans `ANTHROPIC_API_KEY`, l'API garde le mock
      deterministe pour continuer a verifier le contrat phase 2.
- [ ] Validation reelle a faire avec `ANTHROPIC_API_KEY` et un binaire Whisper
      installe/configure sur la machine.
- [ ] Tunnel Cloudflare active (login interactif — cote utilisateur, voir
      `infra/cloudflared/README.md`).

## Demarrage rapide

```sh
pnpm install          # installer les dependances
cp .env.example .env.local   # deja fait ; ajustez si besoin
pnpm db:up            # demarrer Postgres (Docker)
pnpm db:reset:all     # (re)cree le schema, applique les migrations, seed
pnpm dev              # http://localhost:3000
```

Verifier la sante et le scoping :

```sh
node tests/health.mjs         # backend + base (serveur `pnpm dev` requis)
pnpm test:scoping             # isolation par user_id (base seedee requise)
pnpm test:api                 # contrat API phase 2 (serveur `pnpm dev` requis)
```

## Scripts

| Commande                         | Role                                        |
| -------------------------------- | ------------------------------------------- |
| `pnpm dev`                       | serveur de dev Next.js                      |
| `pnpm build`                     | build de production                         |
| `pnpm lint`                      | ESLint                                      |
| `pnpm format`                    | Prettier (ecriture)                         |
| `pnpm format:check`              | Prettier (verification)                     |
| `pnpm typecheck`                 | `tsc --noEmit`                              |
| `pnpm db:up` / `:down` / `:logs` | Postgres (Docker)                           |
| `pnpm db:migrate`                | applique les migrations SQL en attente      |
| `pnpm db:seed`                   | insere les donnees de dev (idempotent)      |
| `pnpm db:reset`                  | remet le schema `public` a zero (dev)       |
| `pnpm db:reset:all`              | reset + migrate + seed                      |
| `pnpm test:scoping`              | test d'isolation par `user_id`              |
| `pnpm test:api`                  | suite API phase 2 sans frontend             |
| `pnpm tunnel`                    | tunnel Cloudflare (config requise, phase 5) |

## Structure

```
app/
  api/                 # Route Handlers = backend testable seul
    auth/[...nextauth] # Auth.js credentials
    captures/          # texte/audio mock + analyse
    health/route.ts    # GET /api/health
lib/
  ai/                  # interfaces transcribe() / analyzeCapture()
  db/                  # client Postgres, types de lignes, requetes scopees user_id
  auth/                # helpers session (phase 2)
db/
  migrations/          # migrations SQL versionnees (0001_init.sql = schema section 8)
scripts/               # migrate / seed / reset (Node + pg, hors runtime Next)
infra/
  cloudflared/         # config du tunnel Cloudflare
tests/                 # scripts de test sans frontend (health, scoping)
```

## Environnement

Variables dans `.env.local` (jamais commite). Template : `.env.example`.
Detail des variables : spec section 9.4.

Variables IA utiles en phase 3 :

| Variable                    | Role                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | Active l'analyse Claude quand elle est renseignee.                            |
| `ANTHROPIC_MODEL`           | Modele Claude utilise par l'analyse structuree.                               |
| `AI_ANALYSIS_PROVIDER`      | Optionnel : `anthropic` ou `mock`; vide = auto.                               |
| `WHISPER_BACKEND`           | Optionnel : `faster-whisper`, `openai-whisper` ou `whisper-cpp`; vide = auto. |
| `WHISPER_EXECUTABLE`        | Optionnel : chemin vers `whisper`, `whisper-cli`, etc.                        |
| `WHISPER_PYTHON_EXECUTABLE` | Optionnel : chemin vers Python pour `faster-whisper`.                         |
| `WHISPER_CPP_MODEL_PATH`    | Requis avec `WHISPER_BACKEND=whisper-cpp`.                                    |
| `WHISPER_LANGUAGE`          | Langue transmise a Whisper (`fr` par defaut).                                 |
| `WHISPER_TIMEOUT_MS`        | Timeout de transcription (`600000` ms conseille).                             |
