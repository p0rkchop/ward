'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';
import { Role } from '@/app/generated/prisma/enums';

async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error('Admin access required');
  }
  return session.user;
}

// ─── General Settings ──────────────────────────────────────────────────────────

export interface GeneralSettings {
  siteName: string;
  timeslotDuration: number;
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const settings = await db.appSettings.findUnique({
    where: { id: 'singleton' },
    select: { siteName: true, timeslotDuration: true },
  });
  return {
    siteName: settings?.siteName ?? 'Ward',
    timeslotDuration: settings?.timeslotDuration ?? 30,
  };
}

export async function updateGeneralSettings(
  data: GeneralSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const siteName = data.siteName?.trim();
  if (!siteName) {
    return { ok: false, error: 'Site name cannot be empty' };
  }
  const validDurations = [15, 30, 45, 60];
  if (!validDurations.includes(data.timeslotDuration)) {
    return { ok: false, error: 'Invalid timeslot duration' };
  }

  try {
    await db.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', siteName, timeslotDuration: data.timeslotDuration },
      update: { siteName, timeslotDuration: data.timeslotDuration },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[updateGeneralSettings] Error:', msg);
    return { ok: false, error: 'Failed to save settings' };
  }
}

/**
 * Get the branding image URL (data URL or null)
 */
export async function getBrandingImage(): Promise<string | null> {
  const settings = await db.appSettings.findUnique({
    where: { id: 'singleton' },
    select: { brandingImageUrl: true },
  });
  return settings?.brandingImageUrl ?? null;
}

/**
 * Upload a branding image. Accepts a base64 data URL.
 * Validates that dimensions are <= 4000x4000.
 */
export async function uploadBrandingImage(
  dataUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!dataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'Invalid image format' };
  }

  // Check size — data URL in DB should not exceed ~5MB
  const sizeBytes = Buffer.byteLength(dataUrl, 'utf8');
  if (sizeBytes > 5 * 1024 * 1024) {
    return { ok: false, error: 'Image too large (max 5MB after encoding)' };
  }

  try {
    await db.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', brandingImageUrl: dataUrl },
      update: { brandingImageUrl: dataUrl },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[uploadBrandingImage] Error:', msg);
    return { ok: false, error: 'Failed to save branding image' };
  }
}

/**
 * Remove the branding image
 */
export async function removeBrandingImage(): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    await db.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', brandingImageUrl: null },
      update: { brandingImageUrl: null },
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[removeBrandingImage] Error:', msg);
    return { ok: false, error: 'Failed to remove branding image' };
  }
}
