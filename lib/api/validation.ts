import { apiError } from "@/lib/api/responses";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JsonObject = Record<string, unknown>;

export async function readJsonObject(request: Request): Promise<JsonObject> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw apiError(400, "invalid_json", "Le corps de requete doit etre un JSON valide.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw apiError(400, "bad_request", "Le corps de requete doit etre un objet JSON.");
  }

  return body as JsonObject;
}

export function requiredString(
  body: JsonObject,
  key: string,
  message = `Le champ ${key} est requis.`,
): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw apiError(400, "bad_request", message);
  }
  return value.trim();
}

export function optionalString(body: JsonObject, key: string): string | null | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre une chaine.`);
  }
  return value.trim() === "" ? null : value.trim();
}

export function optionalBoolean(body: JsonObject, key: string): boolean | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (typeof value !== "boolean") {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre un booleen.`);
  }
  return value;
}

export function optionalEnum<T extends string>(
  body: JsonObject,
  key: string,
  allowed: readonly T[],
): T | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw apiError(
      400,
      "bad_request",
      `Le champ ${key} doit valoir ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

export function optionalUuid(body: JsonObject, key: string): string | null | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre un UUID valide.`);
  }
  return value;
}

export function parseUuid(value: string, label = "id"): string {
  if (!UUID_RE.test(value)) {
    throw apiError(400, "bad_request", `${label} doit etre un UUID valide.`);
  }
  return value;
}

export function optionalStringArray(body: JsonObject, key: string): string[] | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre une liste de chaines.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export function optionalDateString(
  body: JsonObject,
  key: string,
): string | null | undefined {
  if (!(key in body)) {
    return undefined;
  }
  const value = body[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw apiError(400, "bad_request", `Le champ ${key} doit etre une date YYYY-MM-DD.`);
  }
  return value;
}
