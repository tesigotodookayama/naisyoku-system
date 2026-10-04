import { NextRequest, NextResponse } from "next/server";
import type { AppData } from "@/lib/types";
import { readDb, resetDb, writeDb } from "@/lib/db";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readDb();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read database" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as AppData;
    if (!body?.store || !Array.isArray(body.clients)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await writeDb(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to write database" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === "reset") {
      const data = await resetDb();
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
