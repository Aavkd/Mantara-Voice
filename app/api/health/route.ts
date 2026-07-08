import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db/client";

// La sante doit toujours refleter l'etat courant : pas de cache.
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Critere d'acceptation de la phase 0 : renvoie 200 quand le backend tourne.
 * On renvoie aussi l'etat de la connexion Postgres. La base n'est pas encore
 * requise pour demarrer (phase 1), donc une base injoignable degrade le statut
 * en `degraded` (503) plutot que de faire crasher la route.
 */
export async function GET() {
  const db = await checkDbHealth();

  const body = {
    status: db.ok ? "ok" : "degraded",
    service: "mantara-voice-inbox",
    time: new Date().toISOString(),
    db,
  };

  return NextResponse.json(body, { status: db.ok ? 200 : 503 });
}
