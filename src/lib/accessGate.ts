/**
 * Secret entry addresses. No other modules are imported so tests can load this file.
 * A missing or blank env value means that area stays open.
 */

export const ADMIN_ACCESS_COOKIE = "admin_access";
export const PORTAL_ACCESS_COOKIE = "portal_access";
/** 180 days. Bookmarks keep working after the key is accepted once. */
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const COOKIE_LABEL = "naisyoku-access-v1";

export type AccessArea = "admin" | "portal";

export type AccessDecision = "allow" | "deny" | { grant: AccessArea };

export function readAccessKey(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  );
}

export function isPortalPath(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/api/portal" ||
    pathname.startsWith("/api/portal/")
  );
}

export function isSharedDataPath(pathname: string): boolean {
  return pathname === "/api/db" || pathname.startsWith("/api/db/");
}

/** Only these pages accept ?key= and set the long-lived cookie. */
export function entryArea(pathname: string): AccessArea | null {
  if (pathname === "/admin/login") return "admin";
  if (pathname === "/portal/login") return "portal";
  return null;
}

export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

/** Compare without leaking the secret through an early length check. */
export async function keysMatch(provided: string, expected: string): Promise<boolean> {
  const a = await sha256(provided);
  const b = await sha256(expected);
  return timingSafeEqualBytes(a, b);
}

export async function accessCookieValue(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(COOKIE_LABEL));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function cookieMatches(
  cookie: string | null | undefined,
  secret: string | null
): Promise<boolean> {
  if (!secret || !cookie) return false;
  const expected = await accessCookieValue(secret);
  return keysMatch(cookie, expected);
}

export function entryUrl(origin: string, area: AccessArea, secret: string): string {
  const path = area === "admin" ? "/admin/login" : "/portal/login";
  return `${origin}${path}?key=${encodeURIComponent(secret)}`;
}

/** Production-only reminder. Development stays quiet so local work is not blocked. */
export function accessWarning(
  nodeEnv: string | undefined,
  adminKey: string | null,
  portalKey: string | null
): string | null {
  if (nodeEnv !== "production") return null;
  if (adminKey && portalKey) return null;
  if (!adminKey && !portalKey) {
    return "秘密のアドレスがまだ設定されていません。このままだと、アドレスを知っている人は誰でもログイン画面を開けます。Vercel の環境変数 ADMIN_ACCESS_KEY（管理者）と PORTAL_ACCESS_KEY（内職者マイページ）を入れて、再デプロイしてください。";
  }
  if (!adminKey) {
    return "管理者用の秘密のアドレス（ADMIN_ACCESS_KEY）がまだ設定されていません。このままだと、アドレスを知っている人は誰でも管理画面のログインを開けます。";
  }
  return "内職者マイページ用の秘密のアドレス（PORTAL_ACCESS_KEY）がまだ設定されていません。このままだと、アドレスを知っている人は誰でもマイページのログインを開けます。";
}

export async function decideAccess(input: {
  pathname: string;
  /** null when the query parameter is absent. */
  keyParam: string | null;
  adminKey: string | null;
  portalKey: string | null;
  adminCookie: string | null;
  portalCookie: string | null;
}): Promise<AccessDecision> {
  if (isPublicAsset(input.pathname)) return "allow";

  const entry = entryArea(input.pathname);
  if (entry && input.keyParam !== null) {
    const secret = entry === "admin" ? input.adminKey : input.portalKey;
    if (secret) {
      if (await keysMatch(input.keyParam, secret)) return { grant: entry };
      return "deny";
    }
  }

  if (isSharedDataPath(input.pathname)) {
    const adminOk = !input.adminKey || (await cookieMatches(input.adminCookie, input.adminKey));
    const portalOk = !input.portalKey || (await cookieMatches(input.portalCookie, input.portalKey));
    return adminOk || portalOk ? "allow" : "deny";
  }

  if (isPortalPath(input.pathname)) {
    if (!input.portalKey) return "allow";
    return (await cookieMatches(input.portalCookie, input.portalKey)) ? "allow" : "deny";
  }

  if (!input.adminKey) return "allow";
  return (await cookieMatches(input.adminCookie, input.adminKey)) ? "allow" : "deny";
}
