import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { continueAfterLoginHtml } from "@/lib/loginContinueHtml";
import { loginIdsMatch, normalizeLoginId, trimPassword } from "@/lib/loginNormalize";
import { PORTAL_COOKIE } from "@/lib/portalAuth";
import { checkPortalPassword } from "@/lib/portalPasswords";
import { sessionCookieOptions, wantsJsonRequest } from "@/lib/sessionCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailCode = "1" | "unset" | "changed";

function cookieValue(staffId: string, loginId: string) {
  return `${staffId}|${loginId}`;
}

function withSession(response: NextResponse, staffId: string, loginId: string) {
  response.cookies.set(PORTAL_COOKIE, cookieValue(staffId, loginId), sessionCookieOptions());
  return response;
}

function success(staffId: string, loginId: string, asJson: boolean) {
  if (asJson) {
    return withSession(
      NextResponse.json(
        { ok: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      ),
      staffId,
      loginId
    );
  }
  return withSession(
    new NextResponse(continueAfterLoginHtml("/portal/my", "マイページへ進む"), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }),
    staffId,
    loginId
  );
}

function fail(asJson: boolean, code: FailCode = "1", accessKey?: string | null) {
  if (asJson) {
    return NextResponse.json(
      { ok: false, error: code },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const qs = new URLSearchParams({ error: code });
  const key = accessKey?.trim() ?? "";
  if (key) qs.set("key", key);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/portal/login?${qs.toString()}` },
  });
}

function accessKeyFrom(request: NextRequest): string {
  return request.nextUrl.searchParams.get("key")?.trim() ?? "";
}

async function readCredentials(request: NextRequest): Promise<{
  id: string;
  password: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      id?: unknown;
      password?: unknown;
    } | null;
    return {
      id: String(body?.id ?? ""),
      password: String(body?.password ?? ""),
    };
  }
  const form = await request.formData();
  return {
    id: String(form.get("id") ?? ""),
    password: String(form.get("password") ?? ""),
  };
}

/** GET does not sign anyone in. The worker types an ID and password. */
export async function GET(request: NextRequest) {
  const qs = new URLSearchParams();
  const key = accessKeyFrom(request);
  if (key) qs.set("key", key);
  const suffix = qs.size ? `?${qs.toString()}` : "";
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/portal/login${suffix}` },
  });
}

export async function POST(request: NextRequest) {
  const asJson = wantsJsonRequest(request.headers);
  const accessKey = accessKeyFrom(request);
  const raw = await readCredentials(request);
  const id = normalizeLoginId(raw.id);
  const password = trimPassword(raw.password);
  const data = await readDb();
  const staff = data.staff.find((item) => loginIdsMatch(item.loginId, id));
  if (!staff) return fail(asJson, "1", accessKey);
  const state = await checkPortalPassword(staff.id, password);
  if (state === "unset") return fail(asJson, "unset", accessKey);
  if (state !== "ok") return fail(asJson, "1", accessKey);
  return success(staff.id, staff.loginId, asJson);
}
