'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';

async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session.user;
}

export type EventData = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  professionalPassword: string;
  isActive: boolean;
  adminId: string;
  createdAt: Date;
  _count?: { professionals: number };
};

export async function getEvents(): Promise<EventData[]> {
  await requireAdmin();

  const events = await db.event.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { professionals: true },
      },
    },
    take: 100,
  });

  return events as EventData[];
}

export async function createEvent(data: {
  name: string;
  description: string | null;
  startDate: string; // ISO string
  endDate: string; // ISO string
  professionalPassword: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  if (!data.name.trim()) {
    return { ok: false, error: 'Event name is required' };
  }

  if (!data.professionalPassword.trim()) {
    return { ok: false, error: 'Professional password is required' };
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { ok: false, error: 'Invalid date format' };
  }

  if (endDate <= startDate) {
    return { ok: false, error: 'End date must be after start date' };
  }

  try {
    const event = await db.event.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        startDate,
        endDate,
        professionalPassword: data.professionalPassword.trim(),
        adminId: admin.id,
      },
    });

    return { ok: true, id: event.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[createEvent] Error:', msg);
    return { ok: false, error: 'Failed to create event' };
  }
}

export async function updateEvent(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    startDate?: string;
    endDate?: string;
    professionalPassword?: string;
    isActive?: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.professionalPassword !== undefined) updateData.professionalPassword = data.professionalPassword.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  try {
    await db.event.update({
      where: { id },
      data: updateData,
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[updateEvent] Error:', msg);
    return { ok: false, error: 'Failed to update event' };
  }
}

export async function deleteEvent(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    // Soft delete — also unlink any professionals from this event
    await db.event.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Unlink professionals from deleted event
    await db.user.updateMany({
      where: { eventId: id },
      data: { eventId: null },
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[deleteEvent] Error:', msg);
    return { ok: false, error: 'Failed to delete event' };
  }
}
