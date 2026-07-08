export type {
  Analyzer,
  AnalysisResult,
  AnalyzeContext,
  AnalyzedTask,
  ProjectMatch,
  TaskPriority,
} from "./analyze";
export { InvalidAnalysisError } from "./analyze";
export { transcribe, TranscriptionError } from "./transcribe";
export type { Transcriber } from "./transcribe";

import { analyzeCapture as analyzeWithAnthropic } from "./anthropic-analyzer";
import { analyzeCapture as analyzeWithMock } from "./mock-analyzer";
import type { AnalysisResult, AnalyzeContext } from "./analyze";

type AiProvider = "anthropic" | "mock";

function selectedProvider(): AiProvider {
  const configured = process.env.AI_ANALYSIS_PROVIDER?.trim().toLowerCase();
  if (configured === "anthropic" || configured === "mock") {
    return configured;
  }

  return process.env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : "mock";
}

export async function analyzeCapture(context: AnalyzeContext): Promise<AnalysisResult> {
  return selectedProvider() === "anthropic"
    ? analyzeWithAnthropic(context)
    : analyzeWithMock(context);
}
