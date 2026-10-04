import { NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portalAuth";

function clearAndRedirect() {
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/portal/login" },
  });
  res.cookies.set(PORTAL_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}

export async function GET() {
  return clearAndRedirect();
}

export async function POST() {
  return clearAndRedirect();
}
