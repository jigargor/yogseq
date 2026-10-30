"use client";

import {
  createSequenceAction,
  publishShareLinkAction,
  updateSequenceAction,
} from "@/app/actions/sequences";
import type { BuilderDocument } from "./types";

export interface CloudSaveResult {
  id: string;
  shareUrl?: string;
}

function toSequencePayload(document: BuilderDocument) {
  return {
    title: document.title.trim() || "Untitled sequence",
    description: document.description || null,
    level: document.level,
    style: document.style || null,
    targetMinutes: document.targetMinutes,
    tags: document.tags,
    items: document.items,
  };
}

/** Create or update the current builder document in the cloud. */
export async function saveDocumentToCloud(
  document: BuilderDocument,
  existingCloudId: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string; code?: string }> {
  const payload = toSequencePayload(document);
  const result = existingCloudId
    ? await updateSequenceAction(existingCloudId, payload)
    : await createSequenceAction(payload);

  if (!result.ok) return { ok: false, error: result.error, code: result.code };
  return { ok: true, id: result.data.id };
}

/** Ensure the sequence is saved, then publish an unlisted share link. */
export async function shareDocument(
  document: BuilderDocument,
  existingCloudId: string | null,
): Promise<{ ok: true; id: string; shareSlug: string } | { ok: false; error: string; code?: string }> {
  const saved = await saveDocumentToCloud(document, existingCloudId);
  if (!saved.ok) return saved;

  const shared = await publishShareLinkAction(saved.id);
  if (!shared.ok) return { ok: false, error: shared.error, code: shared.code };
  return { ok: true, id: shared.data.id, shareSlug: shared.data.shareSlug };
}
