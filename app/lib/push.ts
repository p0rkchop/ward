import webpush from 'web-push';
import { db } from '@/app/lib/db';

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url: string;
};

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send a push notification to all subscribed devices for a given user.
 * Fire-and-forget — never throws. Stale subscriptions (410/404) are auto-removed.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const jsonPayload = JSON.stringify(payload);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            jsonPayload
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          // 404 or 410 means the subscription is no longer valid
          if (statusCode === 410 || statusCode === 404) {
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      })
    );
  } catch {
    // Fire-and-forget — never let push failures propagate
  }
}
