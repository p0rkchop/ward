// Helper to format a date with timezone support
function formatWithTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(date);
}

/**
 * User display preferences for date/time formatting.
 * These come from the user's session or can be passed explicitly.
 */
export interface DisplayPrefs {
  timeFormat: '12h' | '24h';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timezone: string; // IANA timezone identifier
}

/** Default preferences — used when no session is available */
export const DEFAULT_PREFS: DisplayPrefs = {
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  timezone: 'America/Chicago',
};

/**
 * Format a time (e.g. "2:30 PM" or "14:30") based on user preference.
 */
export function formatTime(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;
  if (prefs.timeFormat === '24h') {
    return formatWithTimezone(date, timezone, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return formatWithTimezone(date, timezone, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format a date (e.g. "Feb 27, 2026" / "27 Feb 2026" / "2026-02-27") based on user preference.
 */
export function formatDate(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;

  switch (prefs.dateFormat) {
    case 'DD/MM/YYYY':
      // Use en-GB locale for day-month-year order
      return date.toLocaleDateString('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    case 'YYYY-MM-DD':
      // Format as ISO-like date with timezone adjustment
      const isoDate = date.toLocaleDateString('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
      return isoDate; // en-CA gives YYYY-MM-DD format
    case 'MM/DD/YYYY':
    default:
      // Use en-US locale for month-day-year order
      return date.toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}

/**
 * Format a date in a short display format (e.g. "Feb 27, 2026") — always NA-friendly.
 */
export function formatDateShort(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;
  return date.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date with the day-of-week (e.g. "Fri, Feb 27, 2026").
 */
export function formatDateWithDay(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;
  return date.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a full date label (e.g. "Friday, February 27").
 */
export function formatDateFull(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;
  return date.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Format a time range (e.g. "2:30 PM – 3:00 PM" or "14:30 – 15:00").
 */
export function formatTimeRange(start: Date, end: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  return `${formatTime(start, prefs)} – ${formatTime(end, prefs)}`;
}

/**
 * Format a date + time range (e.g. "Feb 27, 2026 • 2:30 PM – 3:00 PM").
 */
export function formatDateTimeRange(start: Date, end: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  return `${formatDateShort(start, prefs)} • ${formatTimeRange(start, end, prefs)}`;
}

/**
 * Format a date + time stamp (e.g. "Feb 27, 2:30 PM").
 */
export function formatDateTimeShort(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  const timezone = prefs.timezone || DEFAULT_PREFS.timezone;
  const monthDay = date.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric' });
  return `${monthDay}, ${formatTime(date, prefs)}`;
}

/**
 * Convert a 24h time string like "09:00" or "17:30" to display format.
 * Used for event day start/end times stored as HH:mm strings.
 */
export function formatTimeString(timeStr: string, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  if (prefs.timeFormat === '24h') return timeStr;

  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Build prefs from a session user object (or use defaults).
 */
export function prefsFromSession(user?: {
  timeFormat?: string;
  dateFormat?: string;
  timezone?: string;
} | null): DisplayPrefs {
  return {
    timeFormat: (user?.timeFormat as DisplayPrefs['timeFormat']) || DEFAULT_PREFS.timeFormat,
    dateFormat: (user?.dateFormat as DisplayPrefs['dateFormat']) || DEFAULT_PREFS.dateFormat,
    timezone: user?.timezone || DEFAULT_PREFS.timezone,
  };
}

// ── Event Status ──

export type EventStatus = 'active' | 'ended' | 'upcoming' | 'inactive';

/**
 * Compute an event's display status from its dates and isActive flag.
 */
export function computeEventStatus(event: { startDate: Date; endDate: Date; isActive: boolean }): EventStatus {
  if (!event.isActive) return 'inactive';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(event.endDate);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(event.startDate);
  startDate.setHours(0, 0, 0, 0);
  if (endDate < today) return 'ended';
  if (startDate > today) return 'upcoming';
  return 'active';
}
