import type { AppData } from "./types";

/** scrypt hash stored beside business data. Never sent to the browser. */
export type AdminAuthRecord = {
  passwordHash: string;
  updatedAt: string;
};

export type DbFile = AppData & { adminAuth?: AdminAuthRecord };

export function stripAdminAuth(data: DbFile): AppData {
  const copy: DbFile = { ...data };
  delete copy.adminAuth;
  return copy;
}

/** Keep the hash already on disk. Ignore any adminAuth a client tried to send. */
export function mergeStoredFile(data: DbFile, adminAuth: AdminAuthRecord | null): DbFile {
  const pub = stripAdminAuth(data);
  return adminAuth ? { ...pub, adminAuth } : pub;
}

export function parseAdminAuth(value: unknown): AdminAuthRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<AdminAuthRecord>;
  if (typeof record.passwordHash !== "string" || !record.passwordHash) return null;
  return {
    passwordHash: record.passwordHash,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}
