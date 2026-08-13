import { promises as fs } from "fs";
import path from "path";
import { createSeedDb } from "./seed";
import { createServiceClient, hasSupabaseEnv } from "./supabase";
import type { DBShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "recall-db.json");
const STATE_TABLE = "app_state";
const STATE_ROW = "demo-user";

let memoryDb: DBShape | null = null;

async function readSupabaseDb(): Promise<DBShape> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase storage is not configured");

  const { data, error } = await client
    .from(STATE_TABLE)
    .select("data")
    .eq("user_id", STATE_ROW)
    .maybeSingle();
  if (error) throw new Error(`Failed to read cloud state: ${error.message}`);

  if (data && typeof data.data === "object" && data.data !== null) {
    return data.data as unknown as DBShape;
  }

  const seeded = createSeedDb();
  await persistSupabaseDb(seeded);
  return seeded;
}

async function persistSupabaseDb(db: DBShape) {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase storage is not configured");

  const { error } = await client
    .from(STATE_TABLE)
    .upsert(
      {
        user_id: STATE_ROW,
        data: db as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(`Failed to save cloud state: ${error.message}`);
}

export async function readDb(): Promise<DBShape> {
  if (memoryDb) return memoryDb;

  if (hasSupabaseEnv()) {
    memoryDb = await readSupabaseDb();
    return memoryDb;
  }

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

  if (hasSupabaseEnv()) {
    await persistSupabaseDb(db);
    return;
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // In-memory fallback keeps the local demo usable when the filesystem is read-only.
  }
}

export function resetMemoryDb() {
  memoryDb = null;
}
