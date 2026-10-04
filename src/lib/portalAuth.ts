/** Demo / seed portal logins mapped to staff ids in `createSeedData()`. */
export type PortalSession = {
  loginId: string;
  staffId: string;
};

export const PORTAL_ACCOUNTS: readonly {
  loginId: string;
  password: string;
  staffId: string;
}[] = [
  { loginId: "sato001", password: "pass1234", staffId: "stf_sato" },
  { loginId: "tanaka002", password: "pass5678", staffId: "stf_tanaka" },
  { loginId: "neko003", password: "pass9012", staffId: "stf_neko" },
];

/** Login id used when an older saved staff row has none yet. */
export function defaultLoginIdForStaff(staffId: string): string {
  return PORTAL_ACCOUNTS.find((account) => account.staffId === staffId)?.loginId ?? "";
}

export const PORTAL_SESSION_KEY = "portal_user";
export const PORTAL_COOKIE = "portal_session";

/** Cookie shape only. The server checks the worker and stored password separately. */
export function parsePortalCookie(raw: string | undefined | null): PortalSession | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  const [staffId, loginId] = value.split("|");
  if (!staffId || !loginId || value.split("|").length !== 2) return null;
  return { staffId, loginId };
}

export function readPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortalSession>;
      const session = parsePortalCookie(
        parsed.staffId && parsed.loginId ? `${parsed.staffId}|${parsed.loginId}` : null
      );
      if (session) return session;
    }
  } catch {
    // fall through to cookie
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${PORTAL_COOKIE}=([^;]*)`));
  return parsePortalCookie(match?.[1] ?? null);
}

export function writePortalSession(session: PortalSession) {
  try {
    sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage can be blocked; cookie is enough
  }
}

export function clearPortalSession() {
  try {
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${PORTAL_COOKIE}=; Max-Age=0; path=/`;
}
