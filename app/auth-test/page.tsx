'use client';

import { useState, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';

type LogEntry = {
  time: string;
  type: 'info' | 'success' | 'error' | 'request' | 'response';
  message: string;
};

export default function AuthTestPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [loading, setLoading] = useState(false);
  const [normalized, setNormalized] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
    setLog((prev) => [...prev, { time, type, message }]);
  }, []);

  // Step 1: Send SMS code via /api/auth-test
  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    addLog('request', `POST /api/auth-test { phone: "${phone}" }`);

    try {
      const res = await fetch('/api/auth-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      addLog('response', `${res.status} ${JSON.stringify(data)}`);

      if (data.ok) {
        setNormalized(data.normalized);
        setStep('code');
        addLog('success', `SMS sent to ${data.normalized} — Twilio sendCode OK`);
      } else {
        addLog('error', `Send failed: ${data.error}`);
      }
    } catch (err) {
      addLog('error', `Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code via NextAuth signIn('credentials', ...)
  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    addLog('request', `signIn('credentials', { phoneNumber: "${normalized}", code: "${code}" })`);

    try {
      const result = await signIn('credentials', {
        phoneNumber: normalized,
        code,
        redirect: false,
      });

      addLog('response', `signIn result: ${JSON.stringify(result)}`);

      if (result?.ok) {
        setStep('done');
        addLog('success', 'NextAuth signIn SUCCEEDED — JWT session created!');
      } else {
        addLog('error', `signIn failed: ${result?.error || 'unknown error'}`);
      }
    } catch (err) {
      addLog('error', `signIn exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone('');
    setCode('');
    setStep('phone');
    setNormalized('');
    addLog('info', 'Reset — ready for new test');
  };

  const logColors: Record<LogEntry['type'], string> = {
    info: 'text-gray-400',
    success: 'text-green-400',
    error: 'text-red-400',
    request: 'text-blue-400',
    response: 'text-yellow-400',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Twilio + NextAuth Test</h1>
          <p className="text-gray-500 text-sm">
            Tests the full auth flow: Twilio Verify SMS → NextAuth signIn → JWT session.
            Not linked from the app.
          </p>
        </div>

        {/* Session Status Banner */}
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
          sessionStatus === 'authenticated'
            ? 'border-green-800 bg-green-950 text-green-300'
            : 'border-gray-800 bg-gray-900 text-gray-500'
        }`}>
          <div className="flex items-center justify-between">
            <span>
              Session: <strong>{sessionStatus}</strong>
              {session?.user && (
                <span className="ml-3">
                  | {session.user.name} | {(session.user as any).phoneNumber} | role: {(session.user as any).role}
                </span>
              )}
            </span>
            {session && (
              <span className="text-xs text-gray-600">
                expires {new Date(session.expires).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          {step === 'phone' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Step 1 — Send SMS code via Twilio Verify
              </label>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(414) 861-6375"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleSendCode}
                  disabled={loading || !phone.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded font-medium transition-colors"
                >
                  {loading ? 'Sending…' : 'Send Code'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Any format works — digits are extracted and normalized to E.164.
              </p>
            </div>
          )}

          {step === 'code' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm text-gray-400">
                    Step 2 — Verify code via NextAuth signIn(&apos;credentials&apos;)
                  </label>
                  <p className="text-xs text-gray-600">
                    Sent to {normalized} · Code goes through NextAuth → auth-config → Twilio checkCode
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Start over
                </button>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2.5 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length < 6}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded font-medium transition-colors"
                >
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-green-400 text-lg font-bold mb-2">
                ✓ Full auth flow succeeded
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Twilio SMS → NextAuth signIn → JWT session issued
              </p>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-300 border border-gray-700 px-4 py-2 rounded transition-colors"
              >
                Test again
              </button>
            </div>
          )}
        </div>

        {/* Flow Diagram */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 mb-6 text-xs text-gray-600">
          <span className={step === 'phone' ? 'text-blue-400' : 'text-green-600'}>
            /api/auth-test → sendCode()
          </span>
          {' → '}
          <span className={step === 'code' ? 'text-blue-400' : step === 'done' ? 'text-green-600' : ''}>
            signIn(&apos;credentials&apos;) → /api/auth/[...nextauth]
          </span>
          {' → '}
          <span className={step === 'code' ? 'text-blue-400' : step === 'done' ? 'text-green-600' : ''}>
            authorize() → checkCode()
          </span>
          {' → '}
          <span className={step === 'done' ? 'text-green-400 font-bold' : ''}>
            JWT session
          </span>
        </div>

        {/* Log Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Log</span>
            {log.length > 0 && (
              <button
                onClick={() => setLog([])}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-1 text-sm">
            {log.length === 0 ? (
              <p className="text-gray-700 italic">Waiting for action…</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-600 shrink-0">{entry.time}</span>
                  <span className={logColors[entry.type]}>{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
