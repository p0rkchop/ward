'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // E.164 phone from login page, e.g. "+14148616375"
  const phone = searchParams.get('phone') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);

    // Pass the E.164 phone to NextAuth — matches exactly what Twilio sent to.
    const result = await signIn('credentials', {
      phoneNumber: phone,
      code,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid verification code. Please try again.');
      setLoading(false);
    } else {
      // Fetch the fresh session to check if user needs setup
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user && !session.user.setupComplete) {
          router.push('/auth/setup');
        } else {
          router.push('/');
        }
      } catch {
        // Fallback — middleware will catch it anyway
        router.push('/');
      }
    }
  };

  // Format for display: +1 (414) 861-6375
  const digits = phone.replace(/\D/g, '');
  const displayPhone = digits.length === 11
    ? `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    : phone;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-900 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Enter verification code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            We sent a code to {displayPhone}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
