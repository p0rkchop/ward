'use server';

import { sendVerificationCode } from '@/app/lib/twilio';

export async function requestVerificationCode(phoneNumber: string) {
  // Basic validation
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  if (normalizedPhone.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  const result = await sendVerificationCode(normalizedPhone);
  return result;
}