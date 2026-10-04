/**
 * Admin Logout API Route
 * POST /api/admin/logout
 * Clears the admin_session cookie.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return response;
}
