/**
 * A worker changes their own portal password.
 * The current session cookie stays valid.
 */

import { NextRequest, NextResponse } from "next/server";
import { validatePasswordChange } from "@/lib/adminPasswordPolicy";
import { readDb } from "@/lib/db";
import { checkPortalPassword, setStaffPortalPassword } from "@/lib/portalPasswords";
import { PORTAL_COOKIE, parsePortalCookie } from "@/lib/portalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const session = parsePortalCookie(request.cookies.get(PORTAL_COOKIE)?.value);
  if (!session) return json({ ok: false, message: "ログインしてください。" }, 401);

  const data = await readDb();
  const staff = data.staff.find((item) => item.id === session.staffId);
  if (!staff || staff.loginId.trim() !== session.loginId) {
    return json({ ok: false, message: "ログインしてください。" }, 401);
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  } | null;
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");
  const formError = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
  if (formError) return json({ ok: false, message: formError }, 400);

  const state = await checkPortalPassword(staff.id, currentPassword);
  if (state === "unset") {
    return json(
      {
        ok: false,
        message: "パスワードが未設定です。事務所に連絡して、マイページ用パスワードを設定してもらってください。",
      },
      400
    );
  }
  if (state !== "ok") return json({ ok: false, message: "現在のパスワードが違います。" }, 400);

  await setStaffPortalPassword(staff.id, newPassword);
  return json({
    ok: true,
    message: "パスワードを変更しました。このままマイページを使えます。",
  });
}
