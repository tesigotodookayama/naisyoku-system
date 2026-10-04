import { promises as fs } from "fs";
import path from "path";
import type { AppData, Invoice, Staff } from "./types";
import { createSeedData } from "./seed";
import { formatDocNo } from "./business";

/** On Vercel, only /tmp is writable. Locally use ./data. */
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "naisyoku-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Migrate older saved JSON shapes. */
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

export async function readDb(): Promise<AppData> {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return normalize(JSON.parse(raw) as AppData);
  } catch {
    const seed = createSeedData();
    await writeDb(seed);
    return seed;
  }
}

export async function writeDb(data: AppData): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    DB_PATH,
    JSON.stringify(normalize(data), null, 2),
    "utf-8"
  );
}

export async function resetDb(): Promise<AppData> {
  const seed = createSeedData();
  await writeDb(seed);
  return seed;
}
