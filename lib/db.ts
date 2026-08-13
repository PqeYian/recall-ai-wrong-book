import { promises as fs } from "fs";
import path from "path";
import { createSeedDb } from "./seed";
import { getCurrentUserId } from "./context";
import { createSessionToken, hashPassword } from "./password";
import { createServiceClient, hasSupabaseEnv } from "./supabase";
import type { DBShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "recall-db.json");
const STATE_TABLE = "app_state";

let memoryDb: DBShape | null = null;

async function readSupabaseDb(userId: string): Promise<DBShape> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase storage is not configured");

  const { data, error } = await client
    .from(STATE_TABLE)
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read cloud state: ${error.message}`);

  if (data && typeof data.data === "object" && data.data !== null) {
    return data.data as unknown as DBShape;
  }

  const seeded = createSeedDb();
  await persistSupabaseDb(seeded, userId);
  return seeded;
}

async function persistSupabaseDb(db: DBShape, userId: string) {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase storage is not configured");

  const { error } = await client
    .from(STATE_TABLE)
    .upsert(
      {
        user_id: userId,
        data: db as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(`Failed to save cloud state: ${error.message}`);
}

async function ensureLocalUserSecrets(db: DBShape): Promise<boolean> {
  let changed = false;
  for (const user of db.users) {
    if (!user.passwordHash) {
      user.passwordHash = hashPassword(
        user.email === "demo@recall.app" ? "recall123" : createSessionToken()
      );
      changed = true;
    }
  }
  return changed;
}

export async function readDb(userId = getCurrentUserId()): Promise<DBShape> {
  if (hasSupabaseEnv()) {
    return readSupabaseDb(userId);
  }

  if (memoryDb) return memoryDb;

  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    memoryDb = JSON.parse(raw) as DBShape;
  } catch {
    memoryDb = createSeedDb();
  }

  const changed = await ensureLocalUserSecrets(memoryDb);
  if (changed) await persistDb(memoryDb);
  return memoryDb;
}

export async function persistDb(db: DBShape, userId = getCurrentUserId()) {
  memoryDb = db;

  if (hasSupabaseEnv()) {
    await persistSupabaseDb(db, userId);
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
