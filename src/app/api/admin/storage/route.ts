/**
 * Where admin data is saved. No secrets: only the storage mode.
 * GET /api/admin/storage
 */

import { NextRequest, NextResponse } from "next/server";
import { dataStoreIsPersistent, storageKind } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.cookies.get("admin_session")?.value !== "authenticated") {
    return NextResponse.json(
      { ok: false, message: "ログインしてください。" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const storage = storageKind(process.env);
  return NextResponse.json(
    {
      ok: true,
      storage,
      persistent: dataStoreIsPersistent(),
      vercel: Boolean(process.env.VERCEL),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
