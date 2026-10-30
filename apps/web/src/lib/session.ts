import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/** Current user for server components / actions, or null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    // Missing DATABASE_URL / secrets in local dev should degrade to "signed out".
    return null;
  }
}

/** Current user for REST route handlers (uses the request headers directly). */
export async function getRequestUser(request: Request): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user ?? null;
  } catch {
    return null;
  }
}
