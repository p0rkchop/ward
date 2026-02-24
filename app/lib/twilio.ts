import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error('TWILIO_ACCOUNT_SID is not set');
}
if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('TWILIO_AUTH_TOKEN is not set');
}
if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
  throw new Error('TWILIO_VERIFY_SERVICE_SID is not set');
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Send verification code to phone number via Twilio Verify
 */
export async function sendVerificationCode(phoneNumber: string) {
  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });

    return { success: true, sid: verification.sid };
  } catch (error) {
    console.error('Failed to send verification code:', error);
    return { success: false, error: 'Failed to send verification code' };
  }
}

/**
 * Verify code for phone number
 */
export async function verifyCode(phoneNumber: string, code: string) {
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status,
      error: verificationCheck.status === 'approved' ? undefined : 'Invalid code'
    };
  } catch (error) {
    console.error('Verification check failed:', error);
    return { success: false, error: 'Verification failed' };
  }
}