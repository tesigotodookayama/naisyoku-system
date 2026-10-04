import { hashPassword, verifyPassword } from "./adminPasswordHash";
import type { PortalPasswordMap } from "./adminAuthRecord";
import { readPortalPasswordMap, writePortalPasswordMap } from "./db";
import { PORTAL_ACCOUNTS } from "./portalAuth";
import { portalLoginState, type PortalLoginState } from "./portalPasswordPolicy";

/** Loads hashes, seeding the sample workers only when nothing has been saved yet. */
export async function getPortalPasswords(): Promise<PortalPasswordMap> {
  const existing = await readPortalPasswordMap();
  if (existing) return existing;
  const now = new Date().toISOString();
  const map: PortalPasswordMap = {};
  for (const account of PORTAL_ACCOUNTS) {
    map[account.staffId] = {
      passwordHash: await hashPassword(account.password),
      updatedAt: now,
    };
  }
  await writePortalPasswordMap(map);
  return map;
}

export async function setStaffPortalPassword(staffId: string, password: string): Promise<void> {
  const map = await getPortalPasswords();
  map[staffId] = {
    passwordHash: await hashPassword(password),
    updatedAt: new Date().toISOString(),
  };
  await writePortalPasswordMap(map);
}

export async function removeStaffPortalPassword(staffId: string): Promise<void> {
  const map = await getPortalPasswords();
  if (!map[staffId]) return;
  delete map[staffId];
  await writePortalPasswordMap(map);
}

export async function checkPortalPassword(
  staffId: string,
  password: string
): Promise<PortalLoginState> {
  const map = await getPortalPasswords();
  const hash = map[staffId]?.passwordHash;
  if (!hash) return portalLoginState(false, false);
  const ok = await verifyPassword(password, hash);
  return portalLoginState(true, ok);
}
