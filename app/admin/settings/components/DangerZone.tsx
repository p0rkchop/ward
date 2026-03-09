'use client';

import { useState } from 'react';
import { resetAllData } from '@/app/lib/admin-actions';

const CONFIRM_PHRASE = 'I AM NOT AN IDIOT';

export default function DangerZone() {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  async function handleReset() {
    if (confirmText !== CONFIRM_PHRASE) return;

    setError('');
    setResult('');
    setLoading(true);

    const res = await resetAllData();
    if (!res.ok) {
      setError(res.error);
    } else {
      setResult(res.summary);
      setConfirmText('');
    }
    setLoading(false);
  }

  const confirmed = confirmText === CONFIRM_PHRASE;

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow border border-red-200 dark:border-red-800">
      <h2 className="text-lg font-medium leading-6 text-red-700 dark:text-red-400">Danger Zone</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        These actions are irreversible. Proceed with extreme caution.
      </p>

      <div className="mt-6 space-y-6">
        {/* Reset All Data */}
        <div className="rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Reset All Data</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            Permanently hard-deletes ALL bookings, shifts, events, event days, resources, and all
            user accounts except your own. App settings will be reset to defaults.
            <strong> This cannot be undone.</strong>
          </p>

          {error && (
            <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-green-800 dark:text-green-200 text-sm">
              ✓ Reset complete. {result}
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="confirmReset" className="block text-sm font-medium text-red-700 dark:text-red-400">
              Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              id="confirmReset"
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="mt-1 block w-full rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-red-500"
              autoComplete="off"
            />
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!confirmed || loading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting…' : 'Reset All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
