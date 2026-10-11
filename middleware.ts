import { NextResponse, type NextRequest } from 'next/server';
import { routeAccess, SESSION_COOKIE, verifySession } from '@/lib/auth/edge';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const access = routeAccess(request.nextUrl.pathname, session);
  if (access.kind === 'allow') return NextResponse.next();
  return NextResponse.redirect(new URL(access.to, request.url));
}

export const config = {
  matcher: ['/portfolio/:path*', '/company/:path*', '/curator/:path*', '/onboarding'],
};
