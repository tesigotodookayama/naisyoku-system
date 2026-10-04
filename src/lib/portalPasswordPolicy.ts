/** Same limits as the admin password form. Kept local so this file has no runtime imports. */
export const MIN_PORTAL_PASSWORD_LENGTH = 8;
export const MAX_PORTAL_PASSWORD_LENGTH = 128;

/** Returns a Japanese error, or null when the login id is acceptable. */
export function validatePortalLoginId(loginId: string): string | null {
  const id = loginId.trim();
  if (!id) return "マイページ用ログインIDを入力してください。";
  if (!/^[A-Za-z0-9]{4,32}$/.test(id)) {
    return "ログインIDは英数字4文字以上32文字以内にしてください。";
  }
  return null;
}

/** Password chosen by the office. Blank is handled by the caller. */
export function validatePortalPassword(password: string): string | null {
  if (!password) return "マイページ用パスワードを入力してください。";
  if (password.length < MIN_PORTAL_PASSWORD_LENGTH) {
    return `新しいパスワードは${MIN_PORTAL_PASSWORD_LENGTH}文字以上にしてください。`;
  }
  if (password.length > MAX_PORTAL_PASSWORD_LENGTH) {
    return `新しいパスワードは${MAX_PORTAL_PASSWORD_LENGTH}文字以内にしてください。`;
  }
  return null;
}

export type PortalLoginState = "ok" | "unset" | "reject";

/** No stored hash means the office has not set a password yet. */
export function portalLoginState(hasHash: boolean, passwordOk: boolean): PortalLoginState {
  if (!hasHash) return "unset";
  return passwordOk ? "ok" : "reject";
}
