import { NextRequest, NextResponse } from "next/server";
import { PORTAL_ACCOUNTS, PORTAL_COOKIE } from "@/lib/portalAuth";

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

function fail() {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/portal/login?error=1" },
  });
}

/** GET /api/portal/login?demo=sato001 — link-based demo login. */
export async function GET(request: NextRequest) {
  const demoId = String(request.nextUrl.searchParams.get("demo") ?? "").trim();
  const account = PORTAL_ACCOUNTS.find((a) => a.loginId === demoId);
  if (!account) return fail();
  return success(account.staffId, account.loginId);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const account = PORTAL_ACCOUNTS.find(
    (a) => a.loginId === id && a.password === password
  );
  if (!account) return fail();
  return success(account.staffId, account.loginId);
}
