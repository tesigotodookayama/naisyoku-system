/** Session cookies last 8 hours. Shared by portal and admin login. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  expires: Date;
  path: "/";
};

export function sessionCookieOptions(
  now = Date.now(),
  nodeEnv = process.env.NODE_ENV
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(now + SESSION_MAX_AGE_SECONDS * 1000),
    path: "/",
  };
}

/** Fetch/JSON clients send Accept or Content-Type application/json. */
export function wantsJsonRequest(headers: { get(name: string): string | null }): boolean {
  const accept = headers.get("accept") ?? "";
  const contentType = headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}
