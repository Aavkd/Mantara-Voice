import { apiJson, runApi } from "@/lib/api/responses";
import { readJsonObject, requiredString } from "@/lib/api/validation";
import {
  serializeCapture,
  serializeNote,
  serializeTask,
} from "@/lib/api/serializers";
import { requireSession } from "@/lib/auth/session";
import { createAndAnalyzeCapture } from "@/lib/captures/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    const body = await readJsonObject(request);
    const text = requiredString(body, "text", "Le champ text est requis.");
    const result = await createAndAnalyzeCapture(user.id, "text", text);

    return apiJson(
      {
        capture: serializeCapture(result.capture),
        note: serializeNote(result.note, result.tags),
        tasks: result.tasks.map(serializeTask),
        analysis: result.analysis,
        auto_validated: result.auto_validated,
      },
      201,
    );
  });
}
