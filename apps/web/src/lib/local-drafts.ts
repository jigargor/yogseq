/**
 * Read-only access to sequence drafts the builder keeps in IndexedDB (Dexie).
 *
 * The builder owns the schema; we open the database *without declaring a
 * version* (Dexie "dynamic mode") so we never trigger an upgrade / VersionError.
 * If the builder uses a different database or table name, update the constants.
 */

export const DRAFTS_DB_NAMES = ["yogseq", "yogseq-drafts"] as const;
export const DRAFTS_TABLE_NAMES = ["drafts", "sequences"] as const;

const MIGRATED_KEY = "yogseq:migrated-drafts";
const DISMISSED_KEY = "yogseq:migrate-drafts-dismissed";

export interface LocalDraft {
  /** Stable key used to remember which drafts were already uploaded. */
  key: string;
  title: string;
  description: string | null;
  level: string | null;
  style: string | null;
  targetMinutes: number | null;
  tags: string[];
  items: unknown[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeDraft(raw: unknown, fallbackKey: string): LocalDraft | null {
  const record = asRecord(raw);
  if (!record || !Array.isArray(record.items) || record.items.length === 0) return null;

  const id = record.id ?? record.key ?? record.localId;
  return {
    key: typeof id === "string" || typeof id === "number" ? String(id) : fallbackKey,
    title: asText(record.title) ?? asText(record.name) ?? "Untitled sequence",
    description: asText(record.description),
    level: asText(record.level),
    style: asText(record.style),
    targetMinutes: typeof record.targetMinutes === "number" ? record.targetMinutes : null,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    items: record.items,
  };
}

export function getMigratedDraftKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(MIGRATED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markDraftsMigrated(keys: readonly string[]): void {
  const migrated = getMigratedDraftKeys();
  for (const key of keys) migrated.add(key);
  window.localStorage.setItem(MIGRATED_KEY, JSON.stringify([...migrated]));
}

export function isMigrationDismissed(): boolean {
  return window.localStorage.getItem(DISMISSED_KEY) === "1";
}

export function dismissMigration(): void {
  window.localStorage.setItem(DISMISSED_KEY, "1");
}

/** Drafts found on this device that have not been uploaded yet. */
export async function readLocalDrafts(): Promise<LocalDraft[]> {
  if (typeof indexedDB === "undefined") return [];
  const { default: Dexie } = await import("dexie");
  const migrated = getMigratedDraftKeys();

  for (const dbName of DRAFTS_DB_NAMES) {
    if (!(await Dexie.exists(dbName))) continue;

    const db = new Dexie(dbName);
    try {
      await db.open();
      const table = db.tables.find((candidate) =>
        (DRAFTS_TABLE_NAMES as readonly string[]).includes(candidate.name),
      );
      if (!table) continue;

      const rows = (await table.toArray()) as unknown[];
      const drafts = rows
        .map((row, index) => normalizeDraft(row, `${dbName}:${table.name}:${index}`))
        .filter((draft): draft is LocalDraft => draft !== null && !migrated.has(draft.key));
      if (drafts.length > 0) return drafts;
    } catch {
      // Unreadable database: treat as "no drafts" rather than breaking the library.
    } finally {
      db.close();
    }
  }
  return [];
}
