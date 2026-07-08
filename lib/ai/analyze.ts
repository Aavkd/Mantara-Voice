/**
 * Interface d'analyse IA (SPEC_DESIGN.md sections 7.3 et 9.4).
 *
 * `analyzeCapture()` prend une transcription + du contexte projets et renvoie
 * une structure JSON stable. Le reste du code ne doit dependre que de cette
 * interface, que l'implementation soit le mock de dev ou Claude en phase 3.
 */

export class InvalidAnalysisError extends Error {
  constructor(message = "Sortie IA invalide.") {
    super(message);
    this.name = "InvalidAnalysisError";
  }
}

export type TaskPriority = "low" | "normal" | "high";

export type ProjectMatch = {
  project_id: string | null;
  project_name: string | null;
  /** 0 a 1 ; pilote les seuils d'auto-validation (section 7.6). */
  confidence: number;
  reason: string;
};

export type AnalyzedTask = {
  title: string;
  due_date: string | null;
  priority: TaskPriority;
};

/** Sortie stricte attendue du LLM (section 7.3). */
export type AnalysisResult = {
  title: string;
  clean_note: string;
  project_match: ProjectMatch | null;
  suggest_create_project: boolean;
  tasks: AnalyzedTask[];
  tags: string[];
  needs_review: boolean;
};

/** Contexte injecte dans le prompt (section 7.2). */
export type AnalyzeContext = {
  raw_transcript: string;
  projects: Array<{ id: string; name: string; client_name: string | null }>;
  recent_notes?: Array<{ title: string; body: string }>;
  known_tags?: string[];
};

export interface Analyzer {
  analyzeCapture(input: AnalyzeContext): Promise<AnalysisResult>;
}
