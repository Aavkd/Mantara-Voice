import { NextResponse } from "next/server";

export type ErrorCode =
  | "bad_request"
  | "forbidden"
  | "invalid_ai_json"
  | "invalid_json"
  | "not_found"
  | "not_authenticated"
  | "conflict"
  | "transcription_unavailable"
  | "unprocessable"
  | "server_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;

  constructor(status: number, code: ErrorCode | string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiJson<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function apiError(
  status: number,
  code: ErrorCode | string,
  message: string,
): ApiError {
  return new ApiError(status, code, message);
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return apiJson(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  console.error("Erreur API inattendue", error);
  return apiJson(
    {
      error: {
        code: "server_error",
        message: "Erreur serveur.",
      },
    },
    500,
  );
}

export async function runApi(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error);
  }
}
