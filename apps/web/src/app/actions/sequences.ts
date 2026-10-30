"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { actionError, actionOk, toActionError, type ActionResult } from "@/lib/action-result";
import { rateLimitByIp, type RateLimitName } from "@/lib/rate-limit";
import {
  createSequence,
  duplicateSequence,
  forkSequence,
  parseSequenceInput,
  parseSequenceUpdate,
  publishShareLink,
  softDeleteSequence,
  updateSequence,
} from "@/lib/sequences";
import { getSessionUser } from "@/lib/session";

interface SequenceRef {
  id: string;
}

interface ShareResult {
  id: string;
  shareSlug: string;
}

async function withUser<T>(
  limit: RateLimitName | null,
  run: (userId: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const user = await getSessionUser();
    if (!user) return actionError("unauthorized", "Sign in to continue.");
    if (limit) {
      const result = rateLimitByIp(limit, await headers());
      if (!result.ok)
        return actionError("rate_limited", `Too many requests. Try again in ${result.retryAfterSeconds}s.`);
    }
    return await run(user.id);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createSequenceAction(input: unknown): Promise<ActionResult<SequenceRef>> {
  return withUser("save", async (userId) => {
    const sequence = await createSequence(userId, parseSequenceInput(input));
    revalidatePath("/library");
    return actionOk({ id: sequence.id });
  });
}

export async function updateSequenceAction(
  id: string,
  input: unknown,
): Promise<ActionResult<SequenceRef>> {
  return withUser("save", async (userId) => {
    const sequence = await updateSequence(userId, id, parseSequenceUpdate(input));
    if (!sequence) return actionError("not_found", "Sequence not found.");
    revalidatePath("/library");
    return actionOk({ id: sequence.id });
  });
}

export async function deleteSequenceAction(id: string): Promise<ActionResult<SequenceRef>> {
  return withUser(null, async (userId) => {
    const deleted = await softDeleteSequence(userId, id);
    if (!deleted) return actionError("not_found", "Sequence not found.");
    revalidatePath("/library");
    return actionOk({ id });
  });
}

export async function duplicateSequenceAction(id: string): Promise<ActionResult<SequenceRef>> {
  return withUser("save", async (userId) => {
    const copy = await duplicateSequence(userId, id);
    if (!copy) return actionError("not_found", "Sequence not found.");
    revalidatePath("/library");
    return actionOk({ id: copy.id });
  });
}

export async function publishShareLinkAction(id: string): Promise<ActionResult<ShareResult>> {
  return withUser("share", async (userId) => {
    const sequence = await publishShareLink(userId, id);
    if (!sequence?.shareSlug) return actionError("not_found", "Sequence not found.");
    revalidatePath("/library");
    return actionOk({ id: sequence.id, shareSlug: sequence.shareSlug });
  });
}

export async function forkSequenceAction(shareSlug: string): Promise<ActionResult<SequenceRef>> {
  return withUser("share", async (userId) => {
    const copy = await forkSequence(userId, shareSlug);
    if (!copy) return actionError("not_found", "That shared sequence is no longer available.");
    revalidatePath("/library");
    return actionOk({ id: copy.id });
  });
}
