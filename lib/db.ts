import { promises as fs } from "fs";
import path from "path";
import { createSeedDb } from "./seed";
import type { DBShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "recall-db.json");

let memoryDb: DBShape | null = null;

export async function readDb(): Promise<DBShape> {
  if (memoryDb) return memoryDb;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    memoryDb = JSON.parse(raw) as DBShape;
    return memoryDb;
  } catch {
    memoryDb = createSeedDb();
    await persistDb(memoryDb);
    return memoryDb;
  }
}

export async function persistDb(db: DBShape) {
  memoryDb = db;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // In-memory fallback keeps the demo usable when the filesystem is read-only.
  }
}

export function resetMemoryDb() {
  memoryDb = null;
}
