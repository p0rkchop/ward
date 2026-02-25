'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { requestVerificationCode } from '@/app/lib/auth-actions';

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  // This is already digits-only — it was normalized by the login page
  const phone = searchParams.get('phone') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);

    // Pass the digits-only phone to NextAuth. The authorize callback
    // will strip non-digits again (no-op since it's already digits),
    // then send that to checkCode which normalizes to E.164.
    const result = await signIn('credentials', {
      phoneNumber: phone,
      code,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid verification code. Please try again.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResendSuccess(false);

    const result = await requestVerificationCode(phone);
    if (result.ok) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } else {
      setError(result.error ?? 'Failed to resend code');
    }
    setResending(false);
  };

  // Format phone for display: (414) 861-6375
  const displayPhone = phone.length === 10
    ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
    : phone;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Enter verification code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Code sent to {displayPhone}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
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
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {resendSuccess && (
            <div className="text-green-600 text-sm text-center">Code resent!</div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resending}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {resending ? 'Resending...' : "Didn't receive a code? Resend"}
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
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
