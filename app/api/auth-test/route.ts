import { NextRequest, NextResponse } from 'next/server';
import { sendCode, checkCode, normalizePhone } from '@/app/lib/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, phone, code } = body as {
      action: 'send' | 'check';
      phone?: string;
      code?: string;
    };

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Missing phone' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    if (action === 'send') {
      const result = await sendCode(phone);
      return NextResponse.json({ ...result, normalized });
    }

    if (action === 'check') {
      if (!code) {
        return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 });
      }
      const result = await checkCode(phone, code);
      return NextResponse.json({ ...result, normalized });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
