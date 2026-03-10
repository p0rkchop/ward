'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { updateUserPreferences } from '@/app/lib/user-settings-actions';
import { useTheme } from 'next-themes';

// Common US timezones — ordered by offset, most common first
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Indiana/Indianapolis', label: 'Indiana (Eastern)' },
  { value: 'America/Detroit', label: 'Detroit (Eastern)' },
  { value: 'America/Boise', label: 'Boise (Mountain)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time (AT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Form state
  const [theme, setThemeState] = useState('system');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [notifyViaEmail, setNotifyViaEmail] = useState(true);
  const [notifyViaPush, setNotifyViaPush] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [subscribingPush, setSubscribingPush] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hydration guard for theme
  useEffect(() => {
    setMounted(true);
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Load user prefs from session
  useEffect(() => {
    if (session?.user) {
      setThemeState(session.user.theme || 'system');
      setTimeFormat(session.user.timeFormat || '12h');
      setDateFormat(session.user.dateFormat || 'MM/DD/YYYY');
      setTimezone(session.user.timezone || 'America/Chicago');
      setNotifyViaEmail(session.user.notifyViaEmail ?? true);
      setNotifyViaPush(session.user.notifyViaPush ?? false);
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const user = session!.user;

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const result = await updateUserPreferences({ theme, timeFormat, dateFormat, timezone, notifyViaEmail, notifyViaPush });
    if (result.ok) {
      // Apply the theme immediately
      setTheme(theme);
      // Refresh the session to pick up new prefs
      await updateSession();
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    setSaving(false);
  }

  // Preview formatting
  const now = new Date();
  const previewTime = timeFormat === '24h'
    ? `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    : now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  let previewDate: string;
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const y = now.getFullYear().toString();
  if (dateFormat === 'DD/MM/YYYY') previewDate = `${d}/${m}/${y}`;
  else if (dateFormat === 'YYYY-MM-DD') previewDate = `${y}-${m}-${d}`;
  else previewDate = `${m}/${d}/${y}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your display preferences.</p>
        </div>

        {/* Profile Info (read-only) */}
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Profile</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{user.name || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Role</dt>
              <dd>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : user.role === 'PROFESSIONAL'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{user.phoneNumber}</dd>
            </div>
          </dl>
        </div>

        {/* Display Preferences */}
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Display Preferences</h2>

          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: '☀️' },
                  { value: 'dark', label: 'Dark', icon: '🌙' },
                  { value: 'system', label: 'System', icon: '💻' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setThemeState(opt.value)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                      theme === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {mounted && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Currently using: {currentTheme} theme
                </p>
              )}
            </div>

            {/* Time Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '12h', label: '12-hour', example: '2:30 PM' },
                  { value: '24h', label: '24-hour', example: '14:30' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeFormat(opt.value)}
                    className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 text-sm transition ${
                      timeFormat === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '02/27/2026' },
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '27/02/2026' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-02-27' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDateFormat(opt.value)}
                    className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 text-sm transition ${
                      dateFormat === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Preview</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Date: <span className="font-medium">{previewDate}</span> &nbsp;•&nbsp; Time: <span className="font-medium">{previewTime}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Timezone: {TIMEZONE_OPTIONS.find((t) => t.value === timezone)?.label || timezone}
              </p>
            </div>
          </div>
        </div>

        {/* Notification Preferences (clients and professionals only) */}
        {user.role !== 'ADMIN' && (
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Notification Preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose how you&apos;d like to be notified about bookings, cancellations, and reminders.
            </p>
            <div className="space-y-4">
              {/* Email toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email notifications</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications at {user.email || 'your email address'}</p>
                  {!user.email && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Add an email in your profile to receive email notifications.</p>
                  )}
                </div>
                <div
                  role="switch"
                  aria-checked={notifyViaEmail}
                  onClick={() => setNotifyViaEmail(!notifyViaEmail)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifyViaEmail ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifyViaEmail ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>

              {/* Push toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Push notifications</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive browser push notifications on this device</p>
                  {pushPermission === 'denied' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Push notifications are blocked. Please enable them in your browser settings, then refresh this page.
                    </p>
                  )}
                  {pushPermission === 'unsupported' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Push notifications are not supported by this browser.
                    </p>
                  )}
                </div>
                {pushPermission === 'granted' ? (
                  <div
                    role="switch"
                    aria-checked={notifyViaPush}
                    onClick={() => setNotifyViaPush(!notifyViaPush)}
                    className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifyViaPush ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifyViaPush ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                ) : pushPermission === 'default' ? (
                  <button
                    type="button"
                    disabled={subscribingPush}
                    onClick={async () => {
                      setSubscribingPush(true);
                      try {
                        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                          setMessage({ type: 'error', text: 'Push notifications are not configured. Please contact your administrator.' });
                          return;
                        }
                        const permission = await Notification.requestPermission();
                        setPushPermission(permission);
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
                          setNotifyViaPush(true);
                          // Clear banner dismissal so it doesn't conflict
                          localStorage.removeItem('push_banner_dismissed');
                          setMessage({ type: 'success', text: 'Push notifications enabled!' });
                        } else if (permission === 'denied') {
                          setMessage({ type: 'error', text: 'Push notifications were blocked. You can change this in your browser settings.' });
                        }
                      } catch (err) {
                        console.error('Push subscription failed:', err);
                        setMessage({ type: 'error', text: 'Failed to enable push notifications. Please try again.' });
                      } finally {
                        setSubscribingPush(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {subscribingPush ? 'Enabling...' : 'Enable Push'}
                  </button>
                ) : (
                  <div
                    role="switch"
                    aria-checked={false}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 opacity-50 cursor-not-allowed"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex items-center justify-between">
          <div>
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {message.text}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
