import { promises as fs } from "fs";
import path from "path";
import type { AppData, Invoice, Staff } from "./types";
import { createSeedData } from "./seed";
import { formatDocNo } from "./business";
import {
  mergeStoredFile,
  stripAdminAuth,
  type AdminAuthRecord,
  type DbFile,
} from "./adminAuthRecord";

export type { AdminAuthRecord } from "./adminAuthRecord";
export { mergeStoredFile, stripAdminAuth } from "./adminAuthRecord";

/**
 * On Vercel, only /tmp is writable and it is not durable: a new instance or
 * deploy drops the file. Locally, ./data/db.json persists.
 */
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "naisyoku-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

export function dataStoreIsPersistent(): boolean {
  return !process.env.VERCEL;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Migrate older saved JSON shapes. Does not keep adminAuth. */
function normalize(data: AppData): AppData {
  return {
    ...data,
    staff: data.staff.map((s: Staff) => ({
      ...s,
      emergencyTel: s.emergencyTel ?? "",
    })),
    invoices: data.invoices.map((inv: Invoice, i) => ({
      ...inv,
      number: inv.number || formatDocNo(inv.id || `legacy_${i}`),
    })),
  };
}

/** Business payload only. Drops any password hash before it can reach the browser. */
export function toPublicAppData(data: DbFile): AppData {
  return normalize(stripAdminAuth(data));
}

async function readRaw(): Promise<DbFile | null> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as DbFile;
  } catch {
    return null;
  }
}

function parseAdminAuth(value: unknown): AdminAuthRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<AdminAuthRecord>;
  if (typeof record.passwordHash !== "string" || !record.passwordHash) return null;
  return {
    passwordHash: record.passwordHash,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

export async function readAdminAuth(): Promise<AdminAuthRecord | null> {
  const raw = await readRaw();
  return parseAdminAuth(raw?.adminAuth);
}

export async function readDb(): Promise<AppData> {
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

export async function writeDb(data: AppData): Promise<void> {
  await ensureDir();
  const adminAuth = await readAdminAuth();
  const file = mergeStoredFile(toPublicAppData(data), adminAuth);
  await fs.writeFile(DB_PATH, JSON.stringify(file, null, 2), "utf-8");
}

export async function writeAdminAuth(record: AdminAuthRecord): Promise<void> {
  const data = await readDb();
  await ensureDir();
  const file = mergeStoredFile(data, record);
  await fs.writeFile(DB_PATH, JSON.stringify(file, null, 2), "utf-8");
}

export async function resetDb(): Promise<AppData> {
  const seed = createSeedData();
  await writeDb(seed);
  return seed;
}
