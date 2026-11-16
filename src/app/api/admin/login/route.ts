/**
 * Admin Authentication API
 * POST /api/admin/login
 *
 * Accepts JSON (fetch) or HTML form POST.
 * Success sets the session cookie on a 200 response (JSON or HTML bounce).
 * Empty 303+Set-Cookie is avoided because iOS / WebView often drops it.
 * A stored hash is checked first. ADMIN_ID / ADMIN_PASSWORD are used only
 * when no hash is stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, ADMIN_PASSWORD } from "@/lib/adminCredentials";
import { passwordMatchesStoredOrEnv } from "@/lib/adminPasswordHash";
import { readAdminAuth } from "@/lib/db";
import { continueAfterLoginHtml } from "@/lib/loginContinueHtml";
import { normalizeLoginId, trimPassword } from "@/lib/loginNormalize";
import { sessionCookieOptions, wantsJsonRequest } from "@/lib/sessionCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  const path = raw.split("?")[0] ?? "/";
  if (path.startsWith("/admin/login") || path.startsWith("/api")) return "/";
  return path;
}

function withSession(response: NextResponse) {
  response.cookies.set("admin_session", "authenticated", sessionCookieOptions());
  return response;
}

async function readCredentials(request: NextRequest): Promise<{
  id: string;
  password: string;
  redirectTo: string;
  asJson: boolean;
}> {
  const asJson = wantsJsonRequest(request.headers);
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      id?: string;
      password?: string;
      redirect?: string;
    };
    return {
      id: String(body.id ?? ""),
      password: String(body.password ?? ""),
      redirectTo: safePath(body.redirect),
      asJson,
    };
  }
  const form = await request.formData();
  return {
    id: String(form.get("id") ?? ""),
    password: String(form.get("password") ?? ""),
    redirectTo: safePath(String(form.get("redirect") ?? "/")),
    asJson,
  };
}

function failForm(redirectTo: string) {
  const failQs = new URLSearchParams({ error: "1" });
  if (redirectTo !== "/") failQs.set("redirect", redirectTo);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/admin/login?${failQs.toString()}` },
  });
}

/** GET does not sign anyone in. The admin types an ID and password. */
export async function GET(request: NextRequest) {
  const redirectTo = safePath(request.nextUrl.searchParams.get("redirect"));
  const qs = redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/admin/login${qs}` },
  });
}

export async function POST(request: NextRequest) {
  const { id, password, redirectTo, asJson } = await readCredentials(request);
  const typedId = normalizeLoginId(id);
  const typedPassword = trimPassword(password);
  let stored: Awaited<ReturnType<typeof readAdminAuth>> = null;
  try {
    stored = await readAdminAuth();
  } catch (error) {
    console.error(error);
    const message = "データを読み込めませんでした。しばらくしてからもう一度お試しください。";
    if (asJson) {
      return NextResponse.json({ ok: false, message }, { status: 503 });
    }
    return failForm(redirectTo);
  }
  const passwordOk =
    typedId === normalizeLoginId(ADMIN_ID) &&
    (await passwordMatchesStoredOrEnv(typedPassword, stored?.passwordHash, ADMIN_PASSWORD)) !==
      "reject";

  if (passwordOk) {
    if (asJson) {
      return withSession(NextResponse.json({ ok: true }));
    }
    return withSession(
      new NextResponse(continueAfterLoginHtml(redirectTo || "/", "管理画面へ進む"), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
    );
  }

  if (asJson) {
    return NextResponse.json(
      { ok: false, message: "IDまたはパスワードが正しくありません。" },
      { status: 401 }
    );
  }

  return failForm(redirectTo);
}
