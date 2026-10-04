/** Rules for the admin password-change form. Safe to import from the browser. */

export const MIN_ADMIN_PASSWORD_LENGTH = 8;
export const MAX_ADMIN_PASSWORD_LENGTH = 128;

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

/** Returns a beginner-facing Japanese error, or null when the form is acceptable. */
export function validatePasswordChange(input: PasswordChangeInput): string | null {
  if (!input.currentPassword) {
    return "現在のパスワードを入力してください。";
  }
  if (!input.newPassword) {
    return "新しいパスワードを入力してください。";
  }
  if (input.newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `新しいパスワードは${MIN_ADMIN_PASSWORD_LENGTH}文字以上にしてください。`;
  }
  if (input.newPassword.length > MAX_ADMIN_PASSWORD_LENGTH) {
    return `新しいパスワードは${MAX_ADMIN_PASSWORD_LENGTH}文字以内にしてください。`;
  }
  if (input.confirmPassword !== input.newPassword) {
    return "新しいパスワード（確認）が一致しません。もう一度入力してください。";
  }
  if (input.newPassword === input.currentPassword) {
    return "新しいパスワードは、今のパスワードと違うものにしてください。";
  }
  return null;
}
