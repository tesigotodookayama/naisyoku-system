import { readDb } from "./db";
import { getPortalPasswords } from "./portalPasswords";
import { parsePortalCookie, type PortalSession } from "./portalAuth";

/** Accepts the cookie only when the worker still exists and has a password. */
export async function resolvePortalSession(
  raw: string | undefined | null
): Promise<PortalSession | null> {
  const parsed = parsePortalCookie(raw);
  if (!parsed) return null;
  const data = await readDb();
  const staff = data.staff.find((item) => item.id === parsed.staffId);
  if (!staff || staff.loginId.trim() !== parsed.loginId) return null;
  const passwords = await getPortalPasswords();
  if (!passwords[staff.id]?.passwordHash) return null;
  return { staffId: staff.id, loginId: staff.loginId };
}
