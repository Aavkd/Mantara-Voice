import { apiJson, runApi } from "@/lib/api/responses";
import { serializeSettings } from "@/lib/api/serializers";
import {
  optionalBoolean,
  optionalEnum,
  readJsonObject,
} from "@/lib/api/validation";
import { requireSession } from "@/lib/auth/session";
import { pool } from "@/lib/db/client";
import type { TaskPriority, UserSettings } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

async function getOrCreateSettings(userId: string): Promise<UserSettings> {
  const existing = await pool.query<UserSettings>(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await pool.query<UserSettings>(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     RETURNING *`,
    [userId],
  );
  return created.rows[0];
}

export async function GET() {
  return runApi(async () => {
    const user = await requireSession();
    const settings = await getOrCreateSettings(user.id);
    return apiJson({ settings: serializeSettings(settings) });
  });
}

export async function PATCH(request: Request) {
  return runApi(async () => {
    const user = await requireSession();
    const current = await getOrCreateSettings(user.id);
    const body = await readJsonObject(request);
    const autoValidate =
      optionalBoolean(body, "auto_validate_high_confidence") ??
      current.auto_validate_high_confidence;
    const manualReview =
      optionalBoolean(body, "manual_review_all_captures") ??
      current.manual_review_all_captures;
    const defaultPriority =
      optionalEnum(body, "default_task_priority", TASK_PRIORITIES) ??
      current.default_task_priority;

    const { rows } = await pool.query<UserSettings>(
      `UPDATE user_settings
       SET
         auto_validate_high_confidence = $1,
         manual_review_all_captures = $2,
         default_task_priority = $3
       WHERE user_id = $4
       RETURNING *`,
      [autoValidate, manualReview, defaultPriority, user.id],
    );

    return apiJson({ settings: serializeSettings(rows[0]) });
  });
}
