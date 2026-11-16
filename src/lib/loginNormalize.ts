/**
 * Japanese phone keyboards often send full-width letters/digits and
 * leading/trailing spaces or newlines. Login IDs are compared after NFKC.
 * Passwords are only trimmed — NFKC could change the secret.
 */

export function normalizeLoginId(raw: string): string {
  return raw.normalize("NFKC").trim();
}

export function loginIdsMatch(stored: string, typed: string): boolean {
  return normalizeLoginId(stored).toLowerCase() === normalizeLoginId(typed).toLowerCase();
}

/** Trim only. Do not NFKC a password. */
export function trimPassword(raw: string): string {
  return raw.trim();
}
