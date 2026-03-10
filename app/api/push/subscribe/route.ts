import { NextResponse } from 'next/server';
import { getServerSession } from '@/app/lib/auth';
import { db } from '@/app/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/push/subscribe — register a push subscription for the current user.
 * Body: PushSubscription JSON (from browser PushManager.subscribe())
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, keys } = body ?? {};

  if (!endpoint || typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  // Upsert: if the endpoint already exists for any user, update it to this user
  const existing = await db.pushSubscription.findUnique({ where: { endpoint } });

  if (existing) {
    await db.pushSubscription.update({
      where: { endpoint },
      data: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  } else {
    await db.pushSubscription.create({
      data: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push/subscribe — unregister a push subscription for the current user.
 * Body: { endpoint: string }
 */
export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint } = body ?? {};

  if (!endpoint || typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  // Only delete if it belongs to the current user
  const existing = await db.pushSubscription.findUnique({ where: { endpoint } });
  if (existing && existing.userId === session.user.id) {
    await db.pushSubscription.delete({ where: { endpoint } });
  }

  return NextResponse.json({ ok: true });
}
