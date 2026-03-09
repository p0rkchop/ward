import { Resend } from 'resend';

// ─── Resend client singleton ───────────────────────────────────────────────────

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  client = new Resend(key);
  return client;
}

const FROM_ADDRESS = 'Career Ward <noreply@career-ward.app>';

// ─── Shared HTML layout ────────────────────────────────────────────────────────

function wrapLayout(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.025em;">Career Ward</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              This is an automated notification from Career Ward. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Detail row helper ─────────────────────────────────────────────────────────

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 12px;color:#64748b;font-size:14px;white-space:nowrap;">${label}</td>
      <td style="padding:6px 12px;color:#0f172a;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;
}

function detailsTable(rows: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:6px;width:100%;margin:16px 0;">
      ${rows}
    </table>`;
}

// ─── Booking detail types ──────────────────────────────────────────────────────

export interface BookingEmailData {
  startTime: Date;
  endTime: Date;
  professionalName: string;
  resourceName: string;
  resourceLocation?: string | null;
}

// ─── Format helpers (email-only, always 12h US format) ─────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

function fmtTimeRange(start: Date, end: Date): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

function bookingRows(data: BookingEmailData): string {
  let rows = '';
  rows += detailRow('Date', fmtDate(data.startTime));
  rows += detailRow('Time', fmtTimeRange(data.startTime, data.endTime));
  rows += detailRow('Professional', data.professionalName);
  rows += detailRow('Resource', data.resourceName);
  if (data.resourceLocation) {
    rows += detailRow('Location', data.resourceLocation);
  }
  return rows;
}

// ─── Email templates ───────────────────────────────────────────────────────────

function welcomeHtml(name: string, role: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Welcome to Career Ward!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi ${name}, your account has been set up successfully.</p>
    ${detailsTable(detailRow('Role', role.charAt(0) + role.slice(1).toLowerCase()))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">You can now log in and start using Career Ward.</p>
  `);
}

function bookingConfirmationHtml(data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Booking Confirmed</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Your appointment has been booked. Here are the details:</p>
    ${detailsTable(bookingRows(data))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">If you need to cancel, you can do so from your appointments page.</p>
  `);
}

function bookingCancellationHtml(data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Booking Cancelled</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Your appointment has been cancelled. Here were the details:</p>
    ${detailsTable(bookingRows(data))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">You can book a new appointment from the booking page.</p>
  `);
}

function adminCancelledHtml(data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Booking Cancelled by Administrator</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">An administrator has cancelled the following appointment:</p>
    ${detailsTable(bookingRows(data))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">If you have questions, please contact your event administrator.</p>
  `);
}

function reassignmentHtml(
  oldData: BookingEmailData,
  newData: BookingEmailData
): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Booking Reassigned</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">An administrator has updated your appointment. See the changes below.</p>
    <p style="margin:0 0 4px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Previous</p>
    ${detailsTable(bookingRows(oldData))}
    <p style="margin:16px 0 4px;color:#4f46e5;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Updated</p>
    ${detailsTable(bookingRows(newData))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">If you have questions, please contact your event administrator.</p>
  `);
}

function roleChangedHtml(name: string, newRole: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Your Role Has Changed</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi ${name}, an administrator has updated your account role.</p>
    ${detailsTable(detailRow('New Role', newRole.charAt(0) + newRole.slice(1).toLowerCase()))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">This change takes effect immediately. Please log in again to see your updated access.</p>
  `);
}

function accountDeletedHtml(name: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Account Removed</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi ${name}, your Career Ward account has been removed by an administrator.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">If you believe this was done in error, please contact your event administrator.</p>
  `);
}

function shiftCancelledHtml(data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Appointment Cancelled — Shift Removed</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">A professional's shift has been cancelled, and your appointment has been affected:</p>
    ${detailsTable(bookingRows(data))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Please visit the booking page to reschedule your appointment.</p>
  `);
}

function professionalNewBookingHtml(clientName: string, data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">New Booking on Your Shift</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">A client has booked an appointment on your shift.</p>
    ${detailsTable(
      detailRow('Client', clientName) + detailRow('Date', fmtDate(data.startTime)) + detailRow('Time', fmtTimeRange(data.startTime, data.endTime)) + detailRow('Resource', data.resourceName) + (data.resourceLocation ? detailRow('Location', data.resourceLocation) : '')
    )}
  `);
}

function professionalBookingCancelledHtml(clientName: string, data: BookingEmailData, cancelledBy: 'client' | 'admin'): string {
  const byWhom = cancelledBy === 'client' ? 'The client has' : 'An administrator has';
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Booking Cancelled on Your Shift</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">${byWhom} cancelled an appointment on your shift. The slot is now open.</p>
    ${detailsTable(
      detailRow('Client', clientName) + detailRow('Date', fmtDate(data.startTime)) + detailRow('Time', fmtTimeRange(data.startTime, data.endTime)) + detailRow('Resource', data.resourceName) + (data.resourceLocation ? detailRow('Location', data.resourceLocation) : '')
    )}
  `);
}

function appointmentReminderHtml(name: string, data: BookingEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Appointment Reminder</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">Hi ${name}, you have an upcoming appointment tomorrow:</p>
    ${detailsTable(bookingRows(data))}
    <p style="margin:16px 0 0;color:#64748b;font-size:13px;">If you need to make changes, please visit Career Ward.</p>
  `);
}

// ─── Public API ────────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const { error } = await getClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[email] Resend error:', error.message);
    }
  } catch (err) {
    console.error('[email] Failed to send:', err instanceof Error ? err.message : String(err));
  }
}

export async function sendBookingConfirmation(
  to: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'Booking Confirmed – Career Ward', bookingConfirmationHtml(data));
}

export async function sendBookingCancellation(
  to: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'Booking Cancelled – Career Ward', bookingCancellationHtml(data));
}

export async function sendAdminCancellation(
  to: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'Booking Cancelled by Administrator – Career Ward', adminCancelledHtml(data));
}

export async function sendBookingReassignment(
  to: string,
  oldData: BookingEmailData,
  newData: BookingEmailData
): Promise<void> {
  await send(to, 'Booking Updated – Career Ward', reassignmentHtml(oldData, newData));
}

export async function sendWelcome(
  to: string,
  name: string,
  role: string
): Promise<void> {
  await send(to, 'Welcome to Career Ward', welcomeHtml(name, role));
}

export async function sendRoleChanged(
  to: string,
  name: string,
  newRole: string
): Promise<void> {
  await send(to, 'Your Role Has Changed – Career Ward', roleChangedHtml(name, newRole));
}

export async function sendAccountDeleted(
  to: string,
  name: string
): Promise<void> {
  await send(to, 'Account Removed – Career Ward', accountDeletedHtml(name));
}

export async function sendShiftCancelled(
  to: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'Appointment Cancelled — Shift Removed – Career Ward', shiftCancelledHtml(data));
}

export async function sendProfessionalNewBooking(
  to: string,
  clientName: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'New Booking on Your Shift – Career Ward', professionalNewBookingHtml(clientName, data));
}

export async function sendProfessionalBookingCancelled(
  to: string,
  clientName: string,
  data: BookingEmailData,
  cancelledBy: 'client' | 'admin'
): Promise<void> {
  await send(to, 'Booking Cancelled on Your Shift – Career Ward', professionalBookingCancelledHtml(clientName, data, cancelledBy));
}

export async function sendAppointmentReminder(
  to: string,
  name: string,
  data: BookingEmailData
): Promise<void> {
  await send(to, 'Appointment Reminder – Career Ward', appointmentReminderHtml(name, data));
}

// ─── Email connectivity test ───────────────────────────────────────────────────

export interface EmailTestStep {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface EmailTestResult {
  success: boolean;
  steps: EmailTestStep[];
}

function testEmailHtml(): string {
  return wrapLayout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Email Connectivity Test</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;">This is a test email from Career Ward to verify that the email service is configured correctly.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">If you received this message, email delivery is working as expected.</p>
  `);
}

export async function sendTestEmail(to: string): Promise<EmailTestResult> {
  const steps: EmailTestStep[] = [];

  // Step 1: Check API key
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    steps.push({ label: 'RESEND_API_KEY present', ok: false, detail: 'Environment variable is not set' });
    return { success: false, steps };
  }
  steps.push({ label: 'RESEND_API_KEY present', ok: true });

  // Step 2: Initialize client
  let resend: Resend;
  try {
    resend = getClient();
    steps.push({ label: 'Resend client initialized', ok: true });
  } catch (err) {
    steps.push({
      label: 'Resend client initialized',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { success: false, steps };
  }

  // Step 3: Send email and check Resend response
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Email Connectivity Test – Career Ward',
      html: testEmailHtml(),
    });

    if (error) {
      steps.push({ label: 'Email accepted by Resend', ok: false, detail: error.message });
      return { success: false, steps };
    }

    steps.push({ label: 'Email accepted by Resend', ok: true, detail: `ID: ${data?.id}` });
  } catch (err) {
    steps.push({
      label: 'Email accepted by Resend',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { success: false, steps };
  }

  return { success: true, steps };
}
