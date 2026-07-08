# tests

Scripts de test de l'API, executables sans frontend (SPEC_DESIGN.md section 9.3).

- `health.mjs` : test de fumee phase 0 (`GET /api/health`).
- `scoping.mjs` : isolation applicative par `user_id`.
- `api-phase2.mjs` : suite API phase 2, couvrant Auth.js credentials, boucle
  capture texte -> analyse mock -> note/taches -> validation -> projet,
  recherche, erreurs `422`, zero tache et ressource autre utilisateur `403`.

Usage :

```sh
node tests/health.mjs
pnpm test:scoping
pnpm test:api
BASE_URL=http://localhost:3001 pnpm test:api
```
