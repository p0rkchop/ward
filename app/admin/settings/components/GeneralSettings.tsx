'use client';

import { useState } from 'react';
import { updateGeneralSettings } from '@/app/lib/branding-actions';
import type { GeneralSettings as GeneralSettingsData } from '@/app/lib/branding-actions';

const TIMESLOT_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
];

interface Props {
  initialSettings: GeneralSettingsData;
}

export default function GeneralSettings({ initialSettings }: Props) {
  const [siteName, setSiteName] = useState(initialSettings.siteName);
  const [timeslotDuration, setTimeslotDuration] = useState(initialSettings.timeslotDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave() {
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await updateGeneralSettings({ siteName, timeslotDuration });
    if (!result.ok) {
      setError(result.error);
    } else {
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 4000);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
      <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">General Settings</h2>

      {error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-300 text-sm">
          {success}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Site Name
          </label>
          <input
            id="siteName"
            type="text"
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="timeslotDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Slot Duration (minutes)
          </label>
          <select
            id="timeslotDuration"
            value={timeslotDuration}
            onChange={e => setTimeslotDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          >
            {TIMESLOT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Note: changing the slot duration will affect newly created shifts. Existing shifts are unaffected.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
