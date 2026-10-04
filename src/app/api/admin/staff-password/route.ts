/**
 * Office sets a worker's portal password.
 * The hash is stored beside business data and is not returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import {
  getPortalPasswords,
  removeStaffPortalPassword,
  setStaffPortalPassword,
} from "@/lib/portalPasswords";
import { validatePortalLoginId, validatePortalPassword } from "@/lib/portalPasswordPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest): boolean {
  return request.cookies.get("admin_session")?.value === "authenticated";
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return json({ ok: false, message: "ログインしてください。" }, 401);
  const map = await getPortalPasswords();
  const items = Object.keys(map).map((staffId) => ({ staffId, hasPassword: true }));
  return json({ ok: true, items });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return json({ ok: false, message: "ログインしてください。" }, 401);
  const body = (await request.json().catch(() => null)) as {
    staffId?: unknown;
    loginId?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  } | null;
  const staffId = String(body?.staffId ?? "").trim();
  const loginId = String(body?.loginId ?? "").trim();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  const passwordError = validatePortalPassword(password);
  if (passwordError) return json({ ok: false, message: passwordError }, 400);
  if (confirmPassword !== password) {
    return json(
      { ok: false, message: "新しいパスワード（確認）が一致しません。もう一度入力してください。" },
      400
    );
  }
  const loginError = validatePortalLoginId(loginId);
  if (loginError) return json({ ok: false, message: loginError }, 400);

  const data = await readDb();
  const staff = data.staff.find((item) => item.id === staffId);
  if (!staff) return json({ ok: false, message: "内職者が見つかりません。" }, 404);
  const duplicate = data.staff.some(
    (item) =>
      item.id !== staffId && item.loginId.trim().toLowerCase() === loginId.toLowerCase()
  );
  if (duplicate) {
    return json({ ok: false, message: "このログインIDは別の内職者が使っています。" }, 400);
  }

  if (staff.loginId !== loginId) {
    await writeDb({
      ...data,
      staff: data.staff.map((item) => (item.id === staffId ? { ...item, loginId } : item)),
    });
  }
  await setStaffPortalPassword(staffId, password);
  return json({ ok: true, message: "マイページのパスワードを設定しました。" });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return json({ ok: false, message: "ログインしてください。" }, 401);
  const staffId = String(request.nextUrl.searchParams.get("staffId") ?? "").trim();
  if (!staffId) return json({ ok: false, message: "内職者が見つかりません。" }, 400);
  await removeStaffPortalPassword(staffId);
  return json({ ok: true });
}
