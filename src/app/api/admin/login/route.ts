/**
 * Admin Authentication API
 * POST /api/admin/login
 *
 * Accepts JSON (fetch) or HTML form POST.
 * Form success redirects (303) with the session cookie set.
 * A stored hash is checked first. ADMIN_ID / ADMIN_PASSWORD are used only
 * when no hash is stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, ADMIN_PASSWORD } from "@/lib/adminCredentials";
import { passwordMatchesStoredOrEnv } from "@/lib/adminPasswordHash";
import { readAdminAuth } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  const path = raw.split("?")[0] ?? "/";
  if (path.startsWith("/admin/login") || path.startsWith("/api")) return "/";
  return path;
}

function withSession(response: NextResponse) {
  response.cookies.set("admin_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}

async function readCredentials(request: NextRequest): Promise<{
  id: string;
  password: string;
  redirectTo: string;
  wantsJson: boolean;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");
  if (wantsJson) {
    const body = (await request.json()) as {
      id?: string;
      password?: string;
      redirect?: string;
    };
    return {
      id: String(body.id ?? "").trim(),
      password: String(body.password ?? ""),
      redirectTo: safePath(body.redirect),
      wantsJson: true,
    };
  }
  const form = await request.formData();
  return {
    id: String(form.get("id") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    redirectTo: safePath(String(form.get("redirect") ?? "/")),
    wantsJson: false,
  };
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
  const { id, password, redirectTo, wantsJson } = await readCredentials(request);
  let stored: Awaited<ReturnType<typeof readAdminAuth>> = null;
  try {
    stored = await readAdminAuth();
  } catch (error) {
    console.error(error);
    const message = "データを読み込めませんでした。しばらくしてからもう一度お試しください。";
    if (wantsJson) {
      return NextResponse.json({ ok: false, message }, { status: 503 });
    }
    const failQs = new URLSearchParams({ error: "1" });
    if (redirectTo !== "/") failQs.set("redirect", redirectTo);
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/admin/login?${failQs.toString()}` },
    });
  }
  const passwordOk =
    id === ADMIN_ID &&
    (await passwordMatchesStoredOrEnv(password, stored?.passwordHash, ADMIN_PASSWORD)) !==
      "reject";
  const ok = passwordOk;

  if (ok) {
    if (wantsJson) {
      return withSession(NextResponse.json({ ok: true }));
    }
    return withSession(
      new NextResponse(null, {
        status: 303,
        headers: { Location: redirectTo || "/" },
      })
    );
  }

  if (wantsJson) {
    return NextResponse.json(
      { ok: false, message: "IDまたはパスワードが正しくありません。" },
      { status: 401 }
    );
  }

  const failQs = new URLSearchParams({ error: "1" });
  if (redirectTo !== "/") failQs.set("redirect", redirectTo);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/admin/login?${failQs.toString()}` },
  });
}
