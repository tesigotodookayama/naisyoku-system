import { promises as fs } from "fs";
import path from "path";
import type { AppData } from "./types";
import { createSeedData } from "./seed";
import {
  mergeStoredFile,
  parseAdminAuth,
  parsePortalPasswordMap,
  type AdminAuthRecord,
  type DbFile,
  type PortalPasswordMap,
} from "./adminAuthRecord";
import { toPublicAppData } from "./dbShape";
import { isPersistentStore, storageKind } from "./storageMode";

export type { AdminAuthRecord, PortalPasswordMap } from "./adminAuthRecord";
export { mergeStoredFile, stripAdminAuth } from "./adminAuthRecord";
export { toPublicAppData } from "./dbShape";
export { databaseUrl, isPersistentStore, postgresDriver, storageKind } from "./storageMode";
export type { PostgresDriver, StorageKind } from "./storageMode";

/**
 * On Vercel without Postgres, only /tmp is writable and it is not durable.
 * Locally, ./data/db.json persists. When DATABASE_URL or POSTGRES_URL is set,
 * both business data and adminAuth live in Postgres instead.
 */
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "naisyoku-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function postgresEnabled(): boolean {
  return storageKind(process.env) === "postgres";
}

export function dataStoreIsPersistent(): boolean {
  return isPersistentStore(process.env);
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readRaw(): Promise<DbFile | null> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as DbFile;
  } catch {
    return null;
  }
}

export async function readAdminAuth(): Promise<AdminAuthRecord | null> {
  if (postgresEnabled()) {
    const { readStoredAdminAuth } = await import("./postgresStore");
    return readStoredAdminAuth();
  }
  const raw = await readRaw();
  return parseAdminAuth(raw?.adminAuth);
}

export async function readDb(): Promise<AppData> {
  if (postgresEnabled()) {
    const { readAppData } = await import("./postgresStore");
    return readAppData();
  }
  await ensureDir();
  const raw = await readRaw();
  if (!raw) {
    const seed = createSeedData();
    await writeDb(seed);
    return seed;
  }
  try {
    return toPublicAppData(raw);
  } catch {
    const seed = createSeedData();
    await writeDb(seed);
    return seed;
  }
}

/** null when portal passwords have never been saved. */
export async function readPortalPasswordMap(): Promise<PortalPasswordMap | null> {
  if (postgresEnabled()) {
    const { readStoredPortalPasswords } = await import("./postgresStore");
    return readStoredPortalPasswords();
  }
  const raw = await readRaw();
  if (!raw || !Object.prototype.hasOwnProperty.call(raw, "portalAuth")) return null;
  return parsePortalPasswordMap(raw.portalAuth);
}

export async function writeDb(data: AppData): Promise<void> {
  if (postgresEnabled()) {
    const { writeAppData } = await import("./postgresStore");
    await writeAppData(data);
    return;
  }
  await ensureDir();
  const adminAuth = await readAdminAuth();
  const portalAuth = await readPortalPasswordMap();
  const file = mergeStoredFile(toPublicAppData(data), adminAuth, portalAuth);
  await fs.writeFile(DB_PATH, JSON.stringify(file, null, 2), "utf-8");
}

export async function writeAdminAuth(record: AdminAuthRecord): Promise<void> {
  if (postgresEnabled()) {
    const { writeStoredAdminAuth } = await import("./postgresStore");
    await writeStoredAdminAuth(record);
    return;
  }
  const data = await readDb();
  const portalAuth = await readPortalPasswordMap();
  await ensureDir();
  const file = mergeStoredFile(data, record, portalAuth);
  await fs.writeFile(DB_PATH, JSON.stringify(file, null, 2), "utf-8");
}

export async function writePortalPasswordMap(map: PortalPasswordMap): Promise<void> {
  if (postgresEnabled()) {
    const { writeStoredPortalPasswords } = await import("./postgresStore");
    await writeStoredPortalPasswords(map);
    return;
  }
  const data = await readDb();
  const adminAuth = await readAdminAuth();
  await ensureDir();
  const file = mergeStoredFile(data, adminAuth, map);
  await fs.writeFile(DB_PATH, JSON.stringify(file, null, 2), "utf-8");
}

export async function resetDb(): Promise<AppData> {
  if (postgresEnabled()) {
    const { resetAppData } = await import("./postgresStore");
    return resetAppData();
  }
  const seed = createSeedData();
  await writeDb(seed);
  return seed;
}
