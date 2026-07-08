import { apiError, apiJson, runApi } from "@/lib/api/responses";
import {
  serializeCapture,
  serializeNote,
  serializeTask,
} from "@/lib/api/serializers";
import { requireSession } from "@/lib/auth/session";
import {
  createAndAnalyzeCapture,
  createCapture,
  markCaptureError,
} from "@/lib/captures/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw apiError(400, "bad_request", "La requete doit etre un multipart/form-data.");
    }

    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      throw apiError(400, "bad_request", "Le champ audio est requis.");
    }

    const transcriptValue = formData.get("transcript");
    const transcript =
      typeof transcriptValue === "string" && transcriptValue.trim()
        ? transcriptValue.trim()
        : null;

    if (!transcript) {
      const capture = await createCapture(user.id, "voice", null);
      const errored = await markCaptureError(capture.id);
      return apiJson(
        {
          error: {
            code: "transcription_unavailable",
            message:
              "Transcription audio non branchee en phase 2. Fournissez un champ transcript pour tester le pipeline voix.",
          },
          capture: serializeCapture(errored),
        },
        422,
      );
    }

    const result = await createAndAnalyzeCapture(user.id, "voice", transcript);
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
