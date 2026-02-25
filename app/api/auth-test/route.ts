import { NextRequest, NextResponse } from 'next/server';
import { sendCode, normalizePhone } from '@/app/lib/twilio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth-test
 * Only handles sending the SMS code.
 * Verification is done via NextAuth signIn('credentials', ...) on the client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body as { phone?: string };

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Missing phone' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    const result = await sendCode(phone);
    return NextResponse.json({ ...result, normalized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
