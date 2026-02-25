import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { rateLimit, authRateLimiter, apiRateLimiter, globalRateLimiter } from '@/app/lib/rate-limit';

// Inline role constants to avoid importing from Prisma generated code in middleware
// (middleware runs on Edge Runtime where Prisma imports can be problematic).
const Role = {
  ADMIN: 'ADMIN',
  PROFESSIONAL: 'PROFESSIONAL',
  CLIENT: 'CLIENT',
} as const;

// Rate limiting middleware that runs before authentication
async function applyRateLimiting(req: Request) {
  const pathname = new URL(req.url).pathname;

  // Apply global rate limiting to all requests
  const globalLimit = await rateLimit(req, globalRateLimiter);
  if (!globalLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
    Object.entries(globalLimit.headers || {}).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Apply stricter rate limiting to authentication endpoints
  if (pathname.startsWith('/api/auth/')) {
    const authLimit = await rateLimit(req, authRateLimiter);
    if (!authLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests', message: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
      Object.entries(authLimit.headers || {}).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  // Apply API rate limiting to public API endpoints
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const apiLimit = await rateLimit(req, apiRateLimiter);
    if (!apiLimit.allowed) {
      const response = NextResponse.json(
        { error: 'Too many requests', message: 'API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
      Object.entries(apiLimit.headers || {}).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  return null; // No rate limit violation
}

export default withAuth(
  async function middleware(req) {
    // Apply rate limiting first
    const rateLimitResponse = await applyRateLimiting(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get token from next-auth
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Allow unauthenticated access to auth pages and public routes
    if (pathname.startsWith('/auth/')) {
      return NextResponse.next();
    }

    // Redirect based on role if accessing root
    if (pathname === '/') {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }

      switch (token.role) {
        case Role.ADMIN:
          return NextResponse.redirect(new URL('/admin', req.url));
        case Role.PROFESSIONAL:
          return NextResponse.redirect(new URL('/professional', req.url));
        case Role.CLIENT:
          return NextResponse.redirect(new URL('/client', req.url));
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
        // Allow unauthenticated access to auth pages, health endpoint, and public assets
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
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
    // Match all routes except Next.js internal paths and static files
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};