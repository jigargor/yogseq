"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { user } from "@yogseq/db";
import { actionError, actionOk, toActionError, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

/**
 * Permanently deletes the signed-in user. Sessions, accounts and sequences are
 * removed through `ON DELETE CASCADE` on their `user_id` / `owner_id` columns.
 */
export async function deleteAccount(): Promise<ActionResult<null>> {
  try {
    const current = await getSessionUser();
    if (!current) return actionError("unauthorized", "Sign in to continue.");

    // Clear the session cookie first; the row itself is removed by the cascade below.
    await auth.api.signOut({ headers: await headers() });
    await getDb().delete(user).where(eq(user.id, current.id));
    return actionOk(null);
  } catch (error) {
    return toActionError(error);
  }
}
