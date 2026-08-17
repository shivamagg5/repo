import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseClient } from '@platform/auth';

/**
 * Next.js middleware — route protection for consumer-web.
 *
 * Public routes (no auth required):
 *   /                Homepage and landing pages
 *   /events/*        Public event discovery and detail pages
 *   /auth/*          Login, signup, callback pages
 *   /api/health      Health check (handled by backend, not this app)
 *
 * Protected routes (auth required):
 *   /account/*       User account and profile pages
 *   /tickets/*       User's tickets
 *   /orders/*        User's orders
 *   /checkout/*      Checkout flow
 */

const PUBLIC_PATHS = [
  '/',
  '/events',
  '/venues',
  '/search',
  '/categories',
  '/auth/login',
  '/auth/register',
  '/auth/signup',
  '/auth/callback',
  '/auth/reset-password',
];

const PUBLIC_PREFIXES = ['/events/', '/venues/', '/categories/', '/search/', '/auth/'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.startsWith('/api/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  // Check for session cookie
  const accessToken = request.cookies.get('sb-access-token')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
