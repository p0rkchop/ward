'use server';

import { sendCode, checkCode, normalizePhone } from '@/app/lib/twilio';

/**
 * Server action: send a verification SMS to the given phone number.
 * Returns the normalized (digits-only) phone to use on the verify page.
 */
export async function requestVerificationCode(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { ok: false as const, error: 'Invalid phone number' };
  }
  const result = await sendCode(digits);
  if (!result.ok) {
    return { ok: false as const, error: result.error ?? 'Failed to send code' };
  }
  // Return the normalized digits so the verify page uses the exact same value
  return { ok: true as const, phone: digits };
}

/**
 * Server action: verify the SMS code for a given phone number.
 * This is called directly from the verify page — NOT through NextAuth signIn().
 * Returns the verification result.
 */
export async function verifyPhoneCode(phone: string, code: string) {
  if (!phone || !code || code.length !== 6) {
    return { ok: false as const, error: 'Phone and 6-digit code required' };
  }
  const result = await checkCode(phone, code);
  return result;
}
