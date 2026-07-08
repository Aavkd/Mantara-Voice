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

## Etat : Phase 0 — fondations

- [x] Projet Next.js + TypeScript, ESLint + Prettier.
- [x] `.env.example` (template) + `.env.local` (dev).
- [x] Structure de dossiers (spec section 9.4).
- [x] Postgres via `docker-compose.yml`.
- [x] `GET /api/health` (verifie backend + base).
- [x] Modele de tunnel Cloudflare (`infra/cloudflared/`).
- [ ] Tunnel Cloudflare active (login interactif — cote utilisateur, voir
      `infra/cloudflared/README.md`).

## Demarrage rapide

```sh
pnpm install          # installer les dependances
cp .env.example .env.local   # deja fait ; ajustez si besoin
pnpm db:up            # demarrer Postgres (Docker)
pnpm dev              # http://localhost:3000
```

Verifier la sante :

```sh
node tests/health.mjs
# ou : curl http://localhost:3000/api/health
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
| `pnpm tunnel`                    | tunnel Cloudflare (config requise, phase 5) |

## Structure

```
app/
  api/                 # Route Handlers = backend testable seul
    health/route.ts    # GET /api/health
lib/
  ai/                  # interfaces transcribe() / analyzeCapture()
  db/                  # client Postgres
  auth/                # helpers session (phase 2)
db/
  migrations/          # migrations SQL (phase 1)
infra/
  cloudflared/         # config du tunnel Cloudflare
tests/                 # scripts de test API sans frontend
```

## Environnement

Variables dans `.env.local` (jamais commite). Template : `.env.example`.
Detail des variables : spec section 9.4.
