# tests

Scripts de test de l'API, executables sans frontend (SPEC_DESIGN.md section 9.3).

- `health.mjs` — test de fumee phase 0 (`GET /api/health`).

La suite complete de la boucle capture -> analyse -> note -> validation arrive en
phase 2, quand le contrat API de la section 9.5 est fige.
