import { apiJson, runApi } from "@/lib/api/responses";
import {
  serializeCapture,
  serializeNote,
  serializeTask,
} from "@/lib/api/serializers";
import { parseUuid } from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { getCaptureBundle } from "@/lib/captures/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  return runApi(async () => {
    const user = await requireSession();
    const { id } = await context.params;
    const captureId = parseUuid(id, "capture id");
    const bundle = await getCaptureBundle(user.id, captureId);

    return apiJson({
      capture: serializeCapture(bundle.capture),
      note: bundle.note ? serializeNote(bundle.note, bundle.tags) : null,
      tasks: bundle.tasks.map(serializeTask),
    });
  });
}
