import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Authentication disabled — all requests pass through
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};