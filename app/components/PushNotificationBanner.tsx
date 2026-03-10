'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserPreferences } from '@/app/lib/user-settings-actions';

const DISMISSED_KEY = 'push_banner_dismissed';

export default function PushNotificationBanner() {
  const { data: session, update: updateSession } = useSession();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    // Only show for clients and professionals
    if (session.user.role === 'ADMIN') return;
    // Don't show if already opted in
    if (session.user.notifyViaPush) return;
    // Check browser support
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    // Only show if permission hasn't been decided yet
    if (Notification.permission !== 'default') return;
    // Don't show if previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    setVisible(true);
  }, [session]);

  if (!visible) return null;

  async function handleEnable() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
        await updateUserPreferences({ notifyViaPush: true });
        await updateSession();
      }
      setVisible(false);
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setSubscribing(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-blue-600 dark:text-blue-400 text-lg flex-shrink-0" aria-hidden="true">🔔</span>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Stay updated! Enable push notifications to get instant alerts for bookings and reminders.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleEnable}
            disabled={subscribing}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {subscribing ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
