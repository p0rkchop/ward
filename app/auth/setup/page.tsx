'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { completeSetup } from '@/app/lib/setup-actions';

export default function SetupPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rolePassword, setRolePassword] = useState('');
  const [enablePush, setEnablePush] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ role: string; eventName?: string } | null>(null);

  const pushSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If user opted into push, request permission and subscribe
      let pushSubscribed = false;
      if (enablePush && pushSupported && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
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
            pushSubscribed = true;
          }
        } catch (pushErr) {
          console.error('Push subscription during setup failed:', pushErr);
        }
      }

      const result = await completeSetup(name, email || null, rolePassword || null, pushSubscribed);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess({ role: result.role, eventName: result.eventName });

      // Update the session to reflect new role and setupComplete
      await update();

      // Redirect after a brief delay so user sees the success message
      setTimeout(() => {
        switch (result.role) {
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          case 'PROFESSIONAL':
            router.push('/professional/dashboard');
            break;
          default:
            router.push('/client/dashboard');
        }
      }, 1500);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to Ward</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Set up your account to get started
          </p>
          {session?.user?.phoneNumber && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Phone: {session.user.phoneNumber}
            </p>
          )}
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Set Up!</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Role: <span className="font-medium capitalize">{success.role.toLowerCase()}</span>
              {success.eventName && (
                <span> &middot; Event: {success.eventName}</span>
              )}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add your email to receive booking notifications (confirmations, cancellations, and changes).
              </p>
            </div>

            <div>
              <label htmlFor="rolePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Password <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </label>
              <input
                id="rolePassword"
                type="password"
                value={rolePassword}
                onChange={(e) => setRolePassword(e.target.value)}
                placeholder="Leave blank to register as client"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If you have a role password from your administrator, enter it here.
              </p>
            </div>

            {pushSupported && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  id="enablePush"
                  type="checkbox"
                  checked={enablePush}
                  onChange={(e) => setEnablePush(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="enablePush" className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Enable push notifications</span>
                  <br />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Get instant alerts for bookings, cancellations, and reminders.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
