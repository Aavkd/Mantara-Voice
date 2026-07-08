import { apiJson, runApi } from "@/lib/api/responses";
import {
  serializeCapture,
  serializeNote,
  serializeTask,
} from "@/lib/api/serializers";
import { parseUuid } from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { analyzePersistedCapture } from "@/lib/captures/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const captureId = parseUuid(id, "capture id");
    const result = await analyzePersistedCapture(user.id, captureId);

    return apiJson({
      capture: serializeCapture(result.capture),
      note: serializeNote(result.note, result.tags),
      tasks: result.tasks.map(serializeTask),
      analysis: result.analysis,
      auto_validated: result.auto_validated,
    });
  });
}
