import { auth } from "@/auth";
import { apiError } from "@/lib/api/responses";

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const sessionUser = session?.user;
  const id = sessionUser?.id;
  if (!id) {
    return null;
  }

  return {
    id,
    email: sessionUser.email ?? null,
    name: sessionUser.name ?? null,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw apiError(401, "not_authenticated", "Session requise.");
  }
  return user;
}
