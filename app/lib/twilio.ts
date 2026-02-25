import twilio from 'twilio';

// ─── Twilio client singleton ───────────────────────────────────────────────────

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  client = twilio(sid, token);
  return client;
}

function getServiceSid() {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error('Missing TWILIO_VERIFY_SERVICE_SID');
  return sid;
}

// ─── Phone number normalization ────────────────────────────────────────────────

/**
 * Normalize any phone input to E.164 format for US numbers.
 * Always returns the same string for the same underlying number,
 * regardless of input format.
 *
 * Examples:
 *   "4148616375"     → "+14148616375"
 *   "14148616375"    → "+14148616375"
 *   "+14148616375"   → "+14148616375"
 *   "(414) 861-6375" → "+14148616375"
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function sendCode(phone: string): Promise<{ ok: boolean; error?: string }> {
  const e164 = normalizePhone(phone);
  try {
    await getClient().verify.v2
      .services(getServiceSid())
      .verifications.create({ to: e164, channel: 'sms' });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `sendCode failed: ${msg}` };
  }
}

export async function checkCode(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const e164 = normalizePhone(phone);
  try {
    const result = await getClient().verify.v2
      .services(getServiceSid())
      .verificationChecks.create({ to: e164, code });
    if (result.status === 'approved') {
      return { ok: true };
    }
    return { ok: false, error: `Twilio returned status: ${result.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `checkCode exception: ${msg}` };
  }
}
