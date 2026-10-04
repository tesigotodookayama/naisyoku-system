import { Pool } from "pg";
import { neon } from "@neondatabase/serverless";
import type { AppData } from "./types";
import { createSeedData } from "./seed";
import { toPublicAppData } from "./dbShape";
import { parseAdminAuth, type AdminAuthRecord } from "./adminAuthRecord";
import { databaseUrl, postgresDriver } from "./storageMode";

const DB_KEY = "db";
const AUTH_KEY = "adminAuth";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_store (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

type Row = { key: string; value: unknown };

type Sql = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>;
};

type Session = {
  url: string;
  sql: Sql;
  ready: Promise<void>;
};

let session: Session | null = null;

function asJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function createSql(url: string): Promise<Sql> {
  if (postgresDriver(url) === "neon-http") {
    const sql = neon(url);
    return {
      query: async <T extends Record<string, unknown>>(text: string, params?: unknown[]) =>
        (await sql.query(text, params ?? [])) as T[],
    };
  }
  const pool = new Pool({
    connectionString: url,
    max: process.env.VERCEL ? 1 : 4,
    idleTimeoutMillis: 10_000,
  });
  return {
    query: async <T extends Record<string, unknown>>(text: string, params?: unknown[]) => {
      const result = await pool.query(text, params);
      return result.rows as T[];
    },
  };
}

async function currentSession(): Promise<Session> {
  const url = databaseUrl(process.env);
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL is not set");
  }
  if (session?.url === url) {
    await session.ready;
    return session;
  }
  const sql = await createSql(url);
  const ready = sql.query(CREATE_TABLE_SQL).then(() => undefined);
  const next: Session = { url, sql, ready };
  session = next;
  try {
    await ready;
  } catch (error) {
    if (session === next) session = null;
    throw error;
  }
  return next;
}

async function rowsFor(sql: Sql, keys: string[]): Promise<Row[]> {
  const rows = await sql.query<Row>(
    "SELECT key, value FROM app_store WHERE key = ANY($1::text[])",
    [keys]
  );
  return rows.map((row) => ({ key: row.key, value: asJson(row.value) }));
}

async function upsert(sql: Sql, key: string, value: unknown): Promise<void> {
  await sql.query(
    `INSERT INTO app_store (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

export async function readAppData(): Promise<AppData> {
  const { sql } = await currentSession();
  let rows = await rowsFor(sql, [DB_KEY]);
  let doc = rows.find((row) => row.key === DB_KEY)?.value;
  if (!doc || typeof doc !== "object") {
    const seed = createSeedData();
    await sql.query(
      `INSERT INTO app_store (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO NOTHING`,
      [DB_KEY, JSON.stringify(seed)]
    );
    rows = await rowsFor(sql, [DB_KEY]);
    doc = rows.find((row) => row.key === DB_KEY)?.value;
    if (!doc || typeof doc !== "object") return seed;
  }
  return toPublicAppData(doc as AppData);
}

export async function writeAppData(data: AppData): Promise<void> {
  const { sql } = await currentSession();
  await upsert(sql, DB_KEY, toPublicAppData(data));
}

export async function readStoredAdminAuth(): Promise<AdminAuthRecord | null> {
  const { sql } = await currentSession();
  const rows = await rowsFor(sql, [AUTH_KEY]);
  return parseAdminAuth(rows.find((row) => row.key === AUTH_KEY)?.value);
}

export async function writeStoredAdminAuth(record: AdminAuthRecord): Promise<void> {
  const { sql } = await currentSession();
  await upsert(sql, AUTH_KEY, record);
}

export async function resetAppData(): Promise<AppData> {
  const seed = createSeedData();
  await writeAppData(seed);
  return seed;
}
