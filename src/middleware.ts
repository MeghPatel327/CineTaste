import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths
  const isPublicPath = path === '/login' || path === '/register' || path === '/';
  
  // Admin paths
  const isAdminPath = path.startsWith('/admin');

  // Verify session
  const sessionCookie = request.cookies.get('cinetaste_session')?.value;
  const session = await decrypt(sessionCookie);

  // If trying to access a protected path without session, redirect to login
  if (!isPublicPath && !session && !path.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access admin path without admin role, redirect to dashboard
  if (isAdminPath && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If logged in and trying to access login/register, redirect to dashboard
  if ((path === '/login' || path === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
