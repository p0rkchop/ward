import twilio from 'twilio';

type TwilioClient = ReturnType<typeof twilio>;

const globalForTwilio = globalThis as unknown as {
  twilioClient: TwilioClient | undefined;
};

function getTwilioClient(): TwilioClient {
  if (globalForTwilio.twilioClient) {
    return globalForTwilio.twilioClient;
  }

  if (!process.env.TWILIO_ACCOUNT_SID) {
    throw new Error('TWILIO_ACCOUNT_SID is not set');
  }
  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_AUTH_TOKEN is not set');
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  globalForTwilio.twilioClient = client;
  return client;
}

function getVerifyServiceSid(): string {
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is not set');
  }
  return process.env.TWILIO_VERIFY_SERVICE_SID;
}

/**
 * Normalize phone number to E.164 format required by Twilio
 */
function toE164(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  // If it already has a country code (11+ digits starting with 1 for US), add +
  // Otherwise assume US/CA and prepend +1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // For other lengths, assume it already includes country code
  return `+${digits}`;
}

/**
 * Send verification code to phone number via Twilio Verify
 */
export async function sendVerificationCode(phoneNumber: string) {
  try {
    const e164Phone = toE164(phoneNumber);
    const verification = await getTwilioClient().verify.v2
      .services(getVerifyServiceSid())
      .verifications.create({ to: e164Phone, channel: 'sms' });

    return { success: true, sid: verification.sid, e164Phone };
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
    const e164Phone = toE164(phoneNumber);
    const verificationCheck = await getTwilioClient().verify.v2
      .services(getVerifyServiceSid())
      .verificationChecks.create({ to: e164Phone, code });

    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status,
      valid: verificationCheck.valid,
      sid: verificationCheck.sid,
      to: verificationCheck.to,
      e164Phone,
      error: verificationCheck.status === 'approved' ? undefined : 'Invalid code'
    };
  } catch (error) {
    console.error('Verification check failed:', error);
    return { success: false, error: 'Verification failed' };
  }
}