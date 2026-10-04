export type StorageKind = "postgres" | "file";
export type PostgresDriver = "neon-http" | "pg";

type Env = Record<string, string | undefined>;

/** DATABASE_URL wins. POSTGRES_URL is the other name Vercel/Neon injects. */
export function databaseUrl(env: Env): string | null {
  const primary = env.DATABASE_URL?.trim();
  if (primary) return primary;
  const secondary = env.POSTGRES_URL?.trim();
  if (secondary) return secondary;
  return null;
}

export function storageKind(env: Env): StorageKind {
  return databaseUrl(env) ? "postgres" : "file";
}

/**
 * Neon hosts use the HTTP driver. Any other Postgres URL (local included)
 * uses the wire protocol, because the Neon HTTP driver only speaks to Neon.
 */
export function postgresDriver(url: string): PostgresDriver {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "neon.tech" || host.endsWith(".neon.tech")) return "neon-http";
  } catch {
    // Not a URL; the caller will fail when it tries to connect.
  }
  return "pg";
}

/**
 * Postgres is durable. A file is durable only off Vercel.
 * On Vercel without a database URL, data lives in /tmp and can disappear.
 */
export function isPersistentStore(env: Env): boolean {
  if (storageKind(env) === "postgres") return true;
  return !env.VERCEL;
}
