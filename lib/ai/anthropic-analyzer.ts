import { InvalidAnalysisError } from "@/lib/ai/analyze";
import type { AnalysisResult, AnalyzeContext } from "@/lib/ai/analyze";

const ANTHROPIC_MESSAGES_URL =
  process.env.ANTHROPIC_API_URL ?? "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_RECENT_NOTES = 10;
const MAX_NOTE_BODY_CHARS = 900;

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description: "Titre court et actionnable en francais.",
    },
    clean_note: {
      type: "string",
      description: "Note reformulee, claire et structuree en francais.",
    },
    project_match: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            project_id: {
              anyOf: [{ type: "string" }, { type: "null" }],
              description: "UUID exact d'un projet fourni, ou null.",
            },
            project_name: {
              anyOf: [{ type: "string" }, { type: "null" }],
              description: "Nom exact du projet fourni, ou null.",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            reason: {
              type: "string",
              description: "Justification courte du classement propose.",
            },
          },
          required: ["project_id", "project_name", "confidence", "reason"],
        },
        { type: "null" },
      ],
    },
    suggest_create_project: {
      type: "boolean",
      description: "True si un nouveau projet semble necessaire.",
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
            description: "Action concrete a faire.",
          },
          due_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Date YYYY-MM-DD seulement si explicitement mentionnee.",
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high"],
          },
        },
        required: ["title", "due_date", "priority"],
      },
    },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    needs_review: {
      type: "boolean",
      description: "True si le classement, la note ou les taches demandent verification.",
    },
  },
  required: [
    "title",
    "clean_note",
    "project_match",
    "suggest_create_project",
    "tasks",
    "tags",
    "needs_review",
  ],
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fallbackInboxAnalysis(context: AnalyzeContext, reason: string): AnalysisResult {
  const raw = context.raw_transcript.trim();
  return {
    title: truncate(raw, 72) || "Capture a verifier",
    clean_note: raw,
    project_match: {
      project_id: null,
      project_name: null,
      confidence: 0,
      reason,
    },
    suggest_create_project: false,
    tasks: [],
    tags: [],
    needs_review: true,
  };
}

function buildPrompt(context: AnalyzeContext): string {
  const knownClientNames = [
    ...new Set(
      context.projects
        .map((project) => project.client_name?.trim())
        .filter((name): name is string => !!name),
    ),
  ];
  const promptContext = {
    today: todayIso(),
    projects: context.projects.map((project) => ({
      id: project.id,
      name: project.name,
      client_name: project.client_name,
    })),
    known_client_names: knownClientNames,
    recent_notes: (context.recent_notes ?? []).slice(0, MAX_RECENT_NOTES).map((note) => ({
      title: truncate(note.title, 180),
      body: truncate(note.body, MAX_NOTE_BODY_CHARS),
    })),
    known_tags: context.known_tags ?? [],
    raw_transcript: context.raw_transcript,
  };

  return [
    "Analyse cette capture pour Mantara Voice Inbox.",
    "",
    "Regles imperatives :",
    "- Repondre en francais.",
    "- Retourner uniquement un JSON conforme au schema demande.",
    "- Ne jamais inventer de projet : project_id doit etre exactement un id fourni, sinon null.",
    "- Ne proposer suggest_create_project=true que si la capture parle clairement d'un nouveau sujet non couvert.",
    "- Extraire uniquement les taches vraiment actionnables.",
    "- Ne jamais inventer d'echeance ; due_date vaut null si la date n'est pas explicite.",
    "- Mettre needs_review=true si le projet est incertain, si un nouveau projet est suggere, ou si la note demande verification.",
    "- Confidence forte >= 0.80 seulement quand le projet est clairement reconnu.",
    "",
    "Contexte JSON :",
    JSON.stringify(promptContext, null, 2),
  ].join("\n");
}

function extractResponseJson(responseBody: unknown): unknown {
  if (!isObject(responseBody) || !Array.isArray(responseBody.content)) {
    throw new InvalidAnalysisError("Claude n'a pas renvoye de contenu exploitable.");
  }

  const textBlock = responseBody.content.find(
    (block): block is { type: string; text: string } =>
      isObject(block) && block.type === "text" && typeof block.text === "string",
  );

  if (!textBlock) {
    throw new InvalidAnalysisError("Claude n'a pas renvoye de bloc texte JSON.");
  }

  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new InvalidAnalysisError("Claude a renvoye un JSON illisible.");
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return response.statusText;
  }

  try {
    const body: unknown = JSON.parse(text);
    if (isObject(body) && isObject(body.error) && typeof body.error.message === "string") {
      return body.error.message;
    }
  } catch {
    // Use the raw body below.
  }

  return truncate(text.replace(/\s+/g, " ").trim(), 500);
}

export async function analyzeCapture(context: AnalyzeContext): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY est requis pour l'analyse Claude.");
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0,
      system:
        "Tu es un assistant de tri calme et fiable. Tu transformes des transcriptions brutes en notes, taches et propositions de classement pour les projets Mantara.",
      messages: [
        {
          role: "user",
          content: buildPrompt(context),
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: analysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(`Erreur Anthropic ${response.status}: ${message}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Anthropic a renvoye une reponse non JSON.");
  }

  try {
    return extractResponseJson(body) as AnalysisResult;
  } catch (error) {
    if (error instanceof InvalidAnalysisError) {
      console.warn("Sortie Claude invalide, repli en Inbox.", error.message);
      return fallbackInboxAnalysis(context, error.message);
    }
    throw error;
  }
}
