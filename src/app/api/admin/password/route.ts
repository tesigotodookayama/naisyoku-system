/**
 * Admin password change.
 * POST /api/admin/password
 *
 * Requires the existing admin_session cookie. The current session is kept.
 * The new password is stored as a scrypt hash inside the app data file.
 */

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, ADMIN_PASSWORD } from "@/lib/adminCredentials";
import { passwordMatchesStoredOrEnv, hashPassword } from "@/lib/adminPasswordHash";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  validatePasswordChange,
} from "@/lib/adminPasswordPolicy";
import { dataStoreIsPersistent, readAdminAuth, writeAdminAuth } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest): boolean {
  return request.cookies.get("admin_session")?.value === "authenticated";
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "ログインしてください。" },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  const auth = await readAdminAuth();
  return NextResponse.json(
    {
      ok: true,
      loginId: ADMIN_ID,
      passwordChanged: Boolean(auth?.passwordHash),
      persistent: dataStoreIsPersistent(),
      minLength: MIN_ADMIN_PASSWORD_LENGTH,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  } | null;

  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  const formError = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (formError) {
    return NextResponse.json(
      { ok: false, message: formError },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const auth = await readAdminAuth();
  const match = await passwordMatchesStoredOrEnv(
    currentPassword,
    auth?.passwordHash,
    ADMIN_PASSWORD
  );
  if (match === "reject") {
    return NextResponse.json(
      { ok: false, message: "現在のパスワードが違います。" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const passwordHash = await hashPassword(newPassword);
  try {
    await writeAdminAuth({
      passwordHash,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: "パスワードを保存できませんでした。もう一度お試しください。" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const persistent = dataStoreIsPersistent();
  return NextResponse.json(
    {
      ok: true,
      persistent,
      message: persistent
        ? "パスワードを変更しました。このまま作業を続けられます。"
        : "パスワードを変更しました。この環境では保存が消えることがあり、そのときは元のパスワードで入れます。",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
