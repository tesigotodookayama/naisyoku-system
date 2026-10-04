import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "crypto";

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Node's common interactive default. Kept modest so login stays fast on serverless. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export type StoredPasswordMatch = "stored" | "env" | "reject";

function safeEqualString(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/** scrypt hash. The plaintext password is never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    // Reject absurd parameters so a damaged record cannot stall login.
    if (n < 2 || n > 32768 || r < 1 || r > 16 || p < 1 || p > 2) return false;
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    if (salt.length === 0 || expected.length === 0 || expected.length > 128) return false;
    if (parts[4] !== salt.toString("hex") || parts[5] !== expected.toString("hex")) return false;
    const actual = await scryptAsync(password, salt, expected.length, { N: n, r, p });
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Prefer the stored hash. Env / sample password is accepted only when nothing
 * has been saved (including after an ephemeral disk wipe).
 */
export async function passwordMatchesStoredOrEnv(
  password: string,
  storedHash: string | null | undefined,
  envPassword: string
): Promise<StoredPasswordMatch> {
  if (storedHash) {
    const ok = await verifyPassword(password, storedHash);
    return ok ? "stored" : "reject";
  }
  return safeEqualString(password, envPassword) ? "env" : "reject";
}
