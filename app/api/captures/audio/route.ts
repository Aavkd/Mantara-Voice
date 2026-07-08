import { apiError, apiJson, runApi } from "@/lib/api/responses";
import { serializeCapture, serializeNote, serializeTask } from "@/lib/api/serializers";
import { transcribe, TranscriptionError } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import {
  analyzePersistedCapture,
  createAndAnalyzeCapture,
  createCapture,
  markCaptureError,
  markCaptureTranscribing,
  setCaptureTranscript,
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
      throw apiError(
        400,
        "bad_request",
        "La requete doit etre un multipart/form-data.",
      );
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
      try {
        await markCaptureTranscribing(user.id, capture.id);
        const rawTranscript = await transcribe(audio);
        await setCaptureTranscript(user.id, capture.id, rawTranscript);
        const result = await analyzePersistedCapture(user.id, capture.id);

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
      } catch (error) {
        if (error instanceof TranscriptionError) {
          const errored = await markCaptureError(capture.id);
          return apiJson(
            {
              error: {
                code: "transcription_unavailable",
                message: error.message,
              },
              capture: serializeCapture(errored),
            },
            422,
          );
        }
        throw error;
      }
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
