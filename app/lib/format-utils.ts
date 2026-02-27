import { format } from 'date-fns';

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
  if (prefs.timeFormat === '24h') {
    return format(date, 'HH:mm');
  }
  return format(date, 'h:mm a');
}

/**
 * Format a date (e.g. "Feb 27, 2026" / "27 Feb 2026" / "2026-02-27") based on user preference.
 */
export function formatDate(date: Date, prefs: DisplayPrefs = DEFAULT_PREFS): string {
  switch (prefs.dateFormat) {
    case 'DD/MM/YYYY':
      return format(date, 'dd/MM/yyyy');
    case 'YYYY-MM-DD':
      return format(date, 'yyyy-MM-dd');
    case 'MM/DD/YYYY':
    default:
      return format(date, 'MM/dd/yyyy');
  }
}

/**
 * Format a date in a short display format (e.g. "Feb 27, 2026") — always NA-friendly.
 */
export function formatDateShort(date: Date, _prefs: DisplayPrefs = DEFAULT_PREFS): string {
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a date with the day-of-week (e.g. "Fri, Feb 27, 2026").
 */
export function formatDateWithDay(date: Date, _prefs: DisplayPrefs = DEFAULT_PREFS): string {
  return format(date, 'EEE, MMM d, yyyy');
}

/**
 * Format a full date label (e.g. "Friday, February 27").
 */
export function formatDateFull(date: Date, _prefs: DisplayPrefs = DEFAULT_PREFS): string {
  return format(date, 'EEEE, MMMM d');
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
  return `${format(date, 'MMM d')}, ${formatTime(date, prefs)}`;
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
