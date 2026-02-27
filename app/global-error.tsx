'use client';

import { useEffect } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-red-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Something went wrong</h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Our team has been notified and we&apos;re working to fix it.
            </p>

            {error.digest && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
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
                href="/"
                className="px-6 py-3 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go to homepage
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If the problem persists, please contact support at{' '}
                <a href="mailto:support@ward.app" className="text-purple-600 hover:underline">
                  support@ward.app
                </a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}