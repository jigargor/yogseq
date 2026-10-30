import Dexie, { type EntityTable } from "dexie";
import type { BuilderDocument } from "./types";

export type YogseqDatabase = Dexie & {
  drafts: EntityTable<BuilderDocument, "id">;
};

let database: YogseqDatabase | null = null;

/** Lazily create the IndexedDB database so importing this module on the server is harmless. */
export function getDb(): YogseqDatabase {
  if (database) return database;
  const db = new Dexie("yogseq") as YogseqDatabase;
  db.version(1).stores({ drafts: "id, updatedAt" });
  database = db;
  return db;
}

export async function saveDraft(document: BuilderDocument): Promise<void> {
  await getDb().drafts.put(document);
}

export async function loadLatestDraft(): Promise<BuilderDocument | undefined> {
  return getDb().drafts.orderBy("updatedAt").last();
}

export async function deleteDraft(id: string): Promise<void> {
  await getDb().drafts.delete(id);
}
