'use client';

import { useEffect } from 'react';

export default function ClientDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client dashboard error:', error);
  }, [error]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 border border-red-200 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Could not load dashboard</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        There was a problem loading your client dashboard data. This could be a temporary issue.
      </p>

      {error.digest && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-6 text-left max-w-md mx-auto">
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
            Error ID: {error.digest}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Try again
        </button>
        <a
          href="/client"
          className="px-6 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to client area
        </a>
        <a
          href="/client/book"
          className="px-6 py-3 bg-white dark:bg-gray-900 text-purple-600 font-medium rounded-lg border border-purple-300 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Book new appointment
        </a>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If this continues, please contact support.
        </p>
      </div>
    </div>
  );
}