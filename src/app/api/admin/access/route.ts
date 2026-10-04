/**
 * Entry URLs for a logged-in admin. The keys are not stored in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { accessWarning, entryUrl, readAccessKey } from "@/lib/accessGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  if (request.cookies.get("admin_session")?.value !== "authenticated") {
    return NextResponse.json(
      { ok: false, message: "ログインしてください。" },
      { status: 401, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
    );
  }
  const adminKey = readAccessKey(process.env.ADMIN_ACCESS_KEY);
  const portalKey = readAccessKey(process.env.PORTAL_ACCESS_KEY);
  const origin = originOf(request);
  return NextResponse.json(
    {
      ok: true,
      adminKeySet: Boolean(adminKey),
      portalKeySet: Boolean(portalKey),
      warning: accessWarning(process.env.NODE_ENV, adminKey, portalKey),
      adminEntryUrl: adminKey ? entryUrl(origin, "admin", adminKey) : null,
      portalEntryUrl: portalKey ? entryUrl(origin, "portal", portalKey) : null,
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
  );
}
