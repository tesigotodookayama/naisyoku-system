import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { checkPortalPassword } from "@/lib/portalPasswords";
import { PORTAL_ACCOUNTS, PORTAL_COOKIE } from "@/lib/portalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieValue(staffId: string, loginId: string) {
  return `${staffId}|${loginId}`;
}

function success(staffId: string, loginId: string) {
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/portal/my" },
  });
  res.cookies.set(PORTAL_COOKIE, cookieValue(staffId, loginId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}

function fail(code: "1" | "unset" | "changed" = "1") {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/portal/login?error=${code}` },
  });
}

/** GET /api/portal/login?demo=sato001 — sample login, only while that password is unchanged. */
export async function GET(request: NextRequest) {
  const demoId = String(request.nextUrl.searchParams.get("demo") ?? "").trim();
  const sample = PORTAL_ACCOUNTS.find((account) => account.loginId === demoId);
  if (!sample) return fail();
  const data = await readDb();
  const staff = data.staff.find((item) => item.id === sample.staffId);
  if (!staff || staff.loginId.trim() !== sample.loginId) return fail("unset");
  const state = await checkPortalPassword(staff.id, sample.password);
  if (state === "unset") return fail("unset");
  if (state === "reject") return fail("changed");
  return success(staff.id, staff.loginId);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const data = await readDb();
  const staff = data.staff.find(
    (item) => item.loginId.trim().toLowerCase() === id.toLowerCase()
  );
  if (!staff) return fail();
  const state = await checkPortalPassword(staff.id, password);
  if (state === "unset") return fail("unset");
  if (state !== "ok") return fail();
  return success(staff.id, staff.loginId);
}
