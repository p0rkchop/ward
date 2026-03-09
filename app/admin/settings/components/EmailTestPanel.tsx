'use client';

import { useState } from 'react';
import { testEmailConnectivity } from '@/app/lib/admin-actions';

interface TestStep {
  label: string;
  ok: boolean;
  detail?: string;
}

export default function EmailTestPanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<TestStep[] | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  async function handleTest() {
    if (!email.trim()) return;
    setLoading(true);
    setSteps(null);
    setSuccess(null);

    try {
      const result = await testEmailConnectivity(email.trim());
      setSteps(result.steps);
      setSuccess(result.success);
    } catch {
      setSteps([{ label: 'Server action', ok: false, detail: 'Failed to reach the server' }]);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
      <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
        Email Connectivity Test
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Send a test email to verify that the Resend email service is configured correctly.
      </p>

      <div className="mt-4 flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="block flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTest();
          }}
        />
        <button
          onClick={handleTest}
          disabled={loading || !email.trim()}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send Test'}
        </button>
      </div>

      {steps && (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                step.ok
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}
            >
              <span className="mt-0.5 flex-shrink-0">{step.ok ? '✓' : '✗'}</span>
              <div>
                <span className="font-medium">{step.label}</span>
                {step.detail && (
                  <p className="mt-0.5 text-xs opacity-80">{step.detail}</p>
                )}
              </div>
            </div>
          ))}

          {success !== null && (
            <p
              className={`mt-2 text-sm font-medium ${
                success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}
            >
              {success
                ? 'All checks passed — test email sent successfully.'
                : 'Email test failed. Check the steps above for details.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
