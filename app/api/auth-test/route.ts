import { NextRequest, NextResponse } from 'next/server';
import { sendCode, normalizePhone } from '@/app/lib/twilio';
import { authRateLimiter, rateLimit, getClientIP } from '@/app/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth-test
 * Only handles sending the SMS code.
 * Verification is done via NextAuth signIn('credentials', ...) on the client.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit by client IP — 10 requests per 15 minutes
    const ip = getClientIP(req);
    const { allowed, headers: rlHeaders } = await rateLimit(req, authRateLimiter, ip);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rlHeaders },
      );
    }

    const body = await req.json();
    const { phone } = body as { phone?: string };

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Missing phone' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    const result = await sendCode(phone);
    return NextResponse.json({ ...result, normalized }, { headers: rlHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
