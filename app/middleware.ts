import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Inline role constants (middleware runs on Edge — avoid Prisma imports)
const Role = {
  ADMIN: 'ADMIN',
  PROFESSIONAL: 'PROFESSIONAL',
  CLIENT: 'CLIENT',
} as const;

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Allow unauthenticated access to auth pages
    if (pathname.startsWith('/auth/') || pathname.startsWith('/auth-test')) {
      return NextResponse.next();
    }

    // If authenticated but setup not complete, redirect to setup page
    if (token && !token.setupComplete && pathname !== '/auth/setup') {
      // Allow API routes to pass through (needed for session updates)
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/auth/setup', req.url));
      }
    }

    // Redirect based on role if accessing root
    if (pathname === '/') {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
      switch (token.role) {
        case Role.ADMIN:
          return NextResponse.redirect(new URL('/admin/dashboard', req.url));
        case Role.PROFESSIONAL:
          return NextResponse.redirect(new URL('/professional/dashboard', req.url));
        case Role.CLIENT:
          return NextResponse.redirect(new URL('/client/dashboard', req.url));
        default:
          return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    }

    // Role-based route protection
    if (pathname.startsWith('/admin') && token?.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }
    if (pathname.startsWith('/professional') && token?.role !== Role.PROFESSIONAL) {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }
    if (pathname.startsWith('/client') && token?.role !== Role.CLIENT) {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl?.pathname || '';
        // Allow unauthenticated access to auth pages, auth-test, API auth, and health
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/auth-test') ||
          pathname.startsWith('/api/auth') ||
          pathname === '/api/health'
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};