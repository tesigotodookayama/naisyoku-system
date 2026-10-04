import type { AppData } from "./types";

/** scrypt hash stored beside business data. Never sent to the browser. */
export type AdminAuthRecord = {
  passwordHash: string;
  updatedAt: string;
};

/** One worker's portal password. Keyed by staff id. Never sent to the browser. */
export type PortalPasswordEntry = {
  passwordHash: string;
  updatedAt: string;
};

export type PortalPasswordMap = Record<string, PortalPasswordEntry>;

export type DbFile = AppData & {
  adminAuth?: AdminAuthRecord;
  portalAuth?: PortalPasswordMap;
};

export function stripAdminAuth(data: DbFile): AppData {
  const copy: DbFile = { ...data };
  delete copy.adminAuth;
  delete copy.portalAuth;
  return copy;
}

/**
 * Keep hashes already on disk. A client payload cannot set or clear them.
 * Pass portalAuth only when it should be written; omit it to leave the key off.
 */
export function mergeStoredFile(
  data: DbFile,
  adminAuth: AdminAuthRecord | null,
  portalAuth?: PortalPasswordMap | null
): DbFile {
  const pub = stripAdminAuth(data);
  const file: DbFile = { ...pub };
  if (adminAuth) file.adminAuth = adminAuth;
  if (portalAuth) file.portalAuth = portalAuth;
  return file;
}

export function parsePortalPasswordMap(value: unknown): PortalPasswordMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: PortalPasswordMap = {};
  for (const [staffId, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Partial<PortalPasswordEntry>;
    if (typeof record.passwordHash !== "string" || !record.passwordHash) continue;
    out[staffId] = {
      passwordHash: record.passwordHash,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    };
  }
  return out;
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
