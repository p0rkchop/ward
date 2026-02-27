'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';

export type UserPreferences = {
  theme: string;
  timeFormat: string;
  dateFormat: string;
  timezone: string;
};

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { theme: true, timeFormat: true, dateFormat: true, timezone: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function updateUserPreferences(
  prefs: Partial<UserPreferences>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Validate theme
  const validThemes = ['light', 'dark', 'system'];
  if (prefs.theme && !validThemes.includes(prefs.theme)) {
    return { ok: false, error: 'Invalid theme. Must be light, dark, or system.' };
  }

  // Validate timeFormat
  const validTimeFormats = ['12h', '24h'];
  if (prefs.timeFormat && !validTimeFormats.includes(prefs.timeFormat)) {
    return { ok: false, error: 'Invalid time format. Must be 12h or 24h.' };
  }

  // Validate dateFormat
  const validDateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
  if (prefs.dateFormat && !validDateFormats.includes(prefs.dateFormat)) {
    return { ok: false, error: 'Invalid date format.' };
  }

  // Validate timezone (basic check — must contain a /)
  if (prefs.timezone && !prefs.timezone.includes('/')) {
    return { ok: false, error: 'Invalid timezone. Must be an IANA timezone identifier.' };
  }

  try {
    const data: Record<string, string> = {};
    if (prefs.theme) data.theme = prefs.theme;
    if (prefs.timeFormat) data.timeFormat = prefs.timeFormat;
    if (prefs.dateFormat) data.dateFormat = prefs.dateFormat;
    if (prefs.timezone) data.timezone = prefs.timezone;

    if (Object.keys(data).length === 0) {
      return { ok: false, error: 'No preferences to update' };
    }

    await db.user.update({
      where: { id: session.user.id },
      data,
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[updateUserPreferences] Error:', msg);
    return { ok: false, error: 'Failed to update preferences' };
  }
}
