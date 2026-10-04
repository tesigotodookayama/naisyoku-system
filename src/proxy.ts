/**
 * Next.js Middleware — Admin Route Protection
 *
 * Protects all admin pages (/, /clients, /staff, /projects, /logistics, /finance).
 * If the admin_session cookie is missing or invalid, redirects to /admin/login.
 * The portal routes (/portal/*) use their own sessionStorage-based auth.
 * API routes and static assets are excluded.
 */

import { NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require admin authentication
const PUBLIC_PATHS = [
  '/admin/login',
  '/portal',       // staff portal (uses sessionStorage auth)
  '/api',          // api routes handle their own auth
  '/_next',
  '/favicon.ico',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check admin session cookie
  const session = request.cookies.get('admin_session');

  if (!session || session.value !== 'authenticated') {
    const loginUrl = new URL('/admin/login', request.url);
    // Preserve redirect target so we can send them back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
