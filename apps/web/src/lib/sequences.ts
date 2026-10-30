import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { LEVEL_IDS, sequenceItemSchema, type SequenceItem } from "@yogseq/content";
import { sequences, type Sequence } from "@yogseq/db";
import { getDb } from "@/lib/db";

/**
 * Sequence domain layer. Shared by server actions (`app/actions/sequences.ts`)
 * and REST route handlers (`app/api/sequences/**`). Nothing in here reads the
 * session: callers authenticate and pass `userId`.
 */

export const SEQUENCE_VISIBILITIES = ["private", "unlisted", "public"] as const;
export type SequenceVisibility = (typeof SEQUENCE_VISIBILITIES)[number];

export type DomainErrorCode = "invalid" | "not_found" | "unauthorized" | "rate_limited";

export interface SequenceInput {
  title: string;
  description?: string | null;
  level?: string | null;
  style?: string | null;
  targetMinutes?: number | null;
  tags?: string[];
  items?: SequenceItem[];
  visibility?: SequenceVisibility;
}

export type SequenceUpdate = Partial<SequenceInput>;

const MAX_ITEMS = 500;
const MAX_TAGS = 20;
const SHARE_SLUG_LENGTH = 10;
const ITEMS_SCHEMA = sequenceItemSchema.array().max(MAX_ITEMS);

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export interface DomainError extends Error {
  code: DomainErrorCode;
}

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return Object.assign(new Error(message), { code });
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof Error && "code" in error;
}

export function domainErrorStatus(code: DomainErrorCode): number {
  const statuses = {
    invalid: 400,
    unauthorized: 401,
    not_found: 404,
    rate_limited: 429,
  } as const satisfies Record<DomainErrorCode, number>;
  return statuses[code];
}

/* -------------------------------------------------------------------------- */
/* Input parsing                                                              */
/* -------------------------------------------------------------------------- */

function optionalText(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw domainError("invalid", `${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw domainError("invalid", `${field} is too long`);
  return trimmed.length > 0 ? trimmed : null;
}

/** Validates untrusted JSON (REST body or action payload) into a partial update. */
export function parseSequenceUpdate(input: unknown): SequenceUpdate {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw domainError("invalid", "Expected a JSON object");
  const raw = input as Record<string, unknown>;
  const update: SequenceUpdate = {};

  if (raw.title !== undefined) {
    const title = optionalText(raw.title, "title", 200);
    if (!title) throw domainError("invalid", "title is required");
    update.title = title;
  }

  const description = optionalText(raw.description, "description", 2_000);
  if (description !== undefined) update.description = description;

  const level = optionalText(raw.level, "level", 40);
  if (level !== undefined) {
    if (level !== null && !(LEVEL_IDS as readonly string[]).includes(level))
      throw domainError("invalid", "level is not recognised");
    update.level = level;
  }

  const style = optionalText(raw.style, "style", 80);
  if (style !== undefined) update.style = style;

  if (raw.targetMinutes !== undefined) {
    if (raw.targetMinutes === null) update.targetMinutes = null;
    else if (
      typeof raw.targetMinutes === "number" &&
      Number.isFinite(raw.targetMinutes) &&
      raw.targetMinutes > 0 &&
      raw.targetMinutes <= 1_000
    )
      update.targetMinutes = Math.round(raw.targetMinutes);
    else throw domainError("invalid", "targetMinutes must be a positive number");
  }

  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags) || raw.tags.some((tag) => typeof tag !== "string"))
      throw domainError("invalid", "tags must be an array of strings");
    const tags = [...new Set((raw.tags as string[]).map((tag) => tag.trim().toLowerCase()))]
      .filter((tag) => tag.length > 0 && tag.length <= 40)
      .slice(0, MAX_TAGS);
    update.tags = tags;
  }

  if (raw.items !== undefined) {
    const parsed = ITEMS_SCHEMA.safeParse(raw.items);
    if (!parsed.success)
      throw domainError("invalid", `items are invalid: ${parsed.error.issues[0]?.message ?? ""}`);
    update.items = parsed.data;
  }

  if (raw.visibility !== undefined) {
    if (!(SEQUENCE_VISIBILITIES as readonly unknown[]).includes(raw.visibility))
      throw domainError("invalid", "visibility is not recognised");
    update.visibility = raw.visibility as SequenceVisibility;
  }

  return update;
}

export function parseSequenceInput(input: unknown): SequenceInput {
  const update = parseSequenceUpdate(input);
  if (!update.title) throw domainError("invalid", "title is required");
  return { ...update, title: update.title };
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export async function listSequences(userId: string): Promise<Sequence[]> {
  return getDb()
    .select()
    .from(sequences)
    .where(and(eq(sequences.ownerId, userId), isNull(sequences.deletedAt)))
    .orderBy(desc(sequences.updatedAt));
}

/**
 * Owner (when `userId` matches) can read any non-deleted sequence. Everyone
 * else (including `userId === undefined`) only sees public sequences.
 */
export async function getSequence(id: string, userId?: string): Promise<Sequence | null> {
  const [row] = await getDb()
    .select()
    .from(sequences)
    .where(and(eq(sequences.id, id), isNull(sequences.deletedAt)))
    .limit(1);
  if (!row) return null;
  if (userId && row.ownerId === userId) return row;
  return row.visibility === "public" ? row : null;
}

/** Share-link lookup. Private sequences are never exposed through a slug. */
export async function getSequenceByShareSlug(slug: string): Promise<Sequence | null> {
  if (!slug || slug.length > 64) return null;
  const [row] = await getDb()
    .select()
    .from(sequences)
    .where(
      and(
        eq(sequences.shareSlug, slug),
        isNull(sequences.deletedAt),
        ne(sequences.visibility, "private"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export async function createSequence(userId: string, data: SequenceInput): Promise<Sequence> {
  const now = new Date();
  const id = nanoid(12);
  const visibility = data.visibility ?? "private";
  const [row] = await getDb()
    .insert(sequences)
    .values({
      id,
      ownerId: userId,
      title: data.title,
      description: data.description ?? null,
      level: data.level ?? null,
      style: data.style ?? null,
      targetMinutes: data.targetMinutes ?? null,
      tags: data.tags ?? [],
      items: data.items ?? [],
      visibility,
      shareSlug: visibility === "private" ? null : nanoid(SHARE_SLUG_LENGTH),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw domainError("invalid", "Could not create sequence");
  return row;
}

export async function updateSequence(
  userId: string,
  id: string,
  data: SequenceUpdate,
): Promise<Sequence | null> {
  const existing = await getOwnedSequence(userId, id);
  if (!existing) return null;

  const needsSlug =
    data.visibility !== undefined && data.visibility !== "private" && !existing.shareSlug;

  const [row] = await getDb()
    .update(sequences)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.style !== undefined && { style: data.style }),
      ...(data.targetMinutes !== undefined && { targetMinutes: data.targetMinutes }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.items !== undefined && { items: data.items }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
      ...(needsSlug && { shareSlug: nanoid(SHARE_SLUG_LENGTH) }),
      updatedAt: new Date(),
    })
    .where(and(eq(sequences.id, id), eq(sequences.ownerId, userId), isNull(sequences.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteSequence(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .update(sequences)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(sequences.id, id), eq(sequences.ownerId, userId), isNull(sequences.deletedAt)))
    .returning({ id: sequences.id });
  return rows.length > 0;
}

export async function duplicateSequence(userId: string, id: string): Promise<Sequence | null> {
  const source = await getOwnedSequence(userId, id);
  if (!source) return null;
  return copySequence(userId, source, `${source.title} (copy)`, null);
}

/** Generates (or reuses) a share slug and makes the sequence at least unlisted. */
export async function publishShareLink(userId: string, id: string): Promise<Sequence | null> {
  const existing = await getOwnedSequence(userId, id);
  if (!existing) return null;

  const [row] = await getDb()
    .update(sequences)
    .set({
      shareSlug: existing.shareSlug ?? nanoid(SHARE_SLUG_LENGTH),
      visibility: existing.visibility === "private" ? "unlisted" : existing.visibility,
      updatedAt: new Date(),
    })
    .where(and(eq(sequences.id, id), eq(sequences.ownerId, userId)))
    .returning();
  return row ?? null;
}

/** Copies a shared sequence into `userId`'s library as a private sequence. */
export async function forkSequence(userId: string, shareSlug: string): Promise<Sequence | null> {
  const source = await getSequenceByShareSlug(shareSlug);
  if (!source) return null;
  return copySequence(userId, source, source.title, source.id);
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                  */
/* -------------------------------------------------------------------------- */

async function getOwnedSequence(userId: string, id: string): Promise<Sequence | null> {
  const [row] = await getDb()
    .select()
    .from(sequences)
    .where(and(eq(sequences.id, id), eq(sequences.ownerId, userId), isNull(sequences.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function copySequence(
  userId: string,
  source: Sequence,
  title: string,
  forkedFromId: string | null,
): Promise<Sequence> {
  const now = new Date();
  const [row] = await getDb()
    .insert(sequences)
    .values({
      id: nanoid(12),
      ownerId: userId,
      title,
      description: source.description,
      level: source.level,
      style: source.style,
      targetMinutes: source.targetMinutes,
      tags: source.tags ?? [],
      items: source.items,
      visibility: "private",
      shareSlug: null,
      forkedFromId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw domainError("invalid", "Could not copy sequence");
  return row;
}

/** Narrow a stored `items` jsonb column to validated sequence items (drops bad rows). */
export function readSequenceItems(sequence: Pick<Sequence, "items">): SequenceItem[] {
  const items: SequenceItem[] = [];
  for (const raw of sequence.items) {
    const parsed = sequenceItemSchema.safeParse(raw);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}
