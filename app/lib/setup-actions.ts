'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';
import { Role } from '@/app/generated/prisma/enums';

const ADMIN_SETUP_PASSWORD = 'Admin123$%^';

type SetupResult =
  | { ok: true; role: Role; eventName?: string }
  | { ok: false; error: string };

export async function completeSetup(
  name: string,
  email: string | null,
  rolePassword: string | null
): Promise<SetupResult> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { ok: false, error: 'Name must be at least 2 characters' };
  }

  // Validate email format if provided
  const trimmedEmail = email?.trim() || null;
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: 'Invalid email format' };
  }

  // Determine role based on password
  let role: Role = Role.CLIENT;
  let eventId: string | null = null;
  let eventName: string | undefined;

  const pwd = rolePassword?.trim() || '';

  if (pwd) {
    if (pwd === ADMIN_SETUP_PASSWORD) {
      role = Role.ADMIN;
    } else {
      // Check if it matches any active event's professional password
      const event = await db.event.findFirst({
        where: {
          professionalPassword: pwd,
          isActive: true,
          deletedAt: null,
        },
      });

      if (event) {
        role = Role.PROFESSIONAL;
        eventId = event.id;
        eventName = event.name;
      } else {
        return { ok: false, error: 'Invalid role password. Leave blank to register as a client.' };
      }
    }
  }

  // Update the user
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: trimmedName,
        email: trimmedEmail,
        role,
        setupComplete: true,
        ...(eventId ? { eventId } : {}),
      },
    });

    return { ok: true, role, eventName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Handle unique email constraint
    if (msg.includes('Unique') || msg.includes('unique') || msg.includes('UNIQUE')) {
      return { ok: false, error: 'This email is already in use' };
    }
    console.error('[completeSetup] Error:', msg);
    return { ok: false, error: 'Failed to complete setup. Please try again.' };
  }
}
