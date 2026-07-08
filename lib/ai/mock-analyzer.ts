import type { AnalysisResult, AnalyzeContext, ProjectMatch } from "@/lib/ai/analyze";

export class InvalidAnalysisError extends Error {
  constructor(message = "Sortie IA invalide.") {
    super(message);
    this.name = "InvalidAnalysisError";
  }
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function findProject(
  context: AnalyzeContext,
  needles: string[],
): AnalyzeContext["projects"][number] | null {
  return (
    context.projects.find((project) => {
      const haystack = `${project.name} ${project.client_name ?? ""}`.toLowerCase();
      return needles.some((needle) => haystack.includes(needle));
    }) ?? null
  );
}

function match(
  project: AnalyzeContext["projects"][number] | null,
  confidence: number,
  reason: string,
): ProjectMatch {
  return {
    project_id: project?.id ?? null,
    project_name: project?.name ?? null,
    confidence,
    reason,
  };
}

export async function analyzeCapture(context: AnalyzeContext): Promise<AnalysisResult> {
  const raw = context.raw_transcript.trim();
  const text = raw.toLowerCase();

  if (includesAny(text, ["__invalid_json__", "json invalide", "ia invalide"])) {
    throw new InvalidAnalysisError("Mock IA: JSON invalide demande par le test.");
  }

  const clientProject = findProject(context, ["client x", "site vitrine", "studio x"]);
  const brandProject = findProject(context, ["refonte de marque", "marque"]);
  const studioProject = findProject(context, ["studio interne"]);

  if (includesAny(text, ["nouveau projet", "nouvelle opportunite", "nouvelle piste"])) {
    return {
      title: "Nouvelle opportunite a cadrer",
      clean_note:
        "La capture semble concerner une nouvelle opportunite qui n'est pas encore rattachee a un projet existant.",
      project_match: match(null, 0.36, "Aucun projet existant ne correspond clairement."),
      suggest_create_project: true,
      tasks: [
        {
          title: "Creer le projet propose si l'opportunite est confirmee",
          due_date: null,
          priority: "normal",
        },
      ],
      tags: ["opportunite"],
      needs_review: true,
    };
  }

  if (includesAny(text, ["aucune tache", "note contexte", "pour memoire"])) {
    return {
      title: "Note de contexte",
      clean_note: raw,
      project_match: match(studioProject, 0.58, "Le contexte est general et reste a verifier."),
      suggest_create_project: false,
      tasks: [],
      tags: ["contexte"],
      needs_review: true,
    };
  }

  if (includesAny(text, ["client x", "devis", "site vitrine"])) {
    return {
      title: "Relancer sur la validation du devis",
      clean_note:
        "Relancer le client X au sujet de la validation du devis et verifier si le perimetre du site doit etre ajuste.",
      project_match: match(
        clientProject,
        0.92,
        "La capture mentionne le devis et le contexte du site vitrine.",
      ),
      suggest_create_project: false,
      tasks: [
        {
          title: "Relancer le client pour la validation du devis",
          due_date: includesAny(text, ["vendredi", "ven."]) ? "2026-07-10" : null,
          priority: "high",
        },
        {
          title: "Verifier le perimetre du site",
          due_date: null,
          priority: "normal",
        },
      ],
      tags: ["devis", "relance"],
      needs_review: false,
    };
  }

  if (includesAny(text, ["palette", "couleur", "marque", "identite"])) {
    return {
      title: "Refonte du systeme de couleurs",
      clean_note:
        "Idee de palette plus chaude pour la marque. Le rattachement projet semble plausible mais doit etre verifie.",
      project_match: match(
        brandProject ?? studioProject,
        0.61,
        "La capture parle de marque, mais le projet exact reste incertain.",
      ),
      suggest_create_project: false,
      tasks: [
        {
          title: "Clarifier la palette a tester",
          due_date: null,
          priority: "normal",
        },
      ],
      tags: ["marque", "idee"],
      needs_review: true,
    };
  }

  if (includesAny(text, ["reserver", "studio photo", "penser a"])) {
    return {
      title: raw.length > 80 ? "Action a classer manuellement" : raw,
      clean_note: "A classer manuellement : " + raw,
      project_match: match(null, 0.28, "Aucun projet fiable n'est identifiable."),
      suggest_create_project: false,
      tasks: [
        {
          title: raw,
          due_date: null,
          priority: "normal",
        },
      ],
      tags: [],
      needs_review: true,
    };
  }

  return {
    title: raw.length > 72 ? `${raw.slice(0, 69)}...` : raw,
    clean_note: raw,
    project_match: match(null, 0.2, "Le mock ne detecte pas de projet fiable."),
    suggest_create_project: false,
    tasks: [],
    tags: [],
    needs_review: true,
  };
}
