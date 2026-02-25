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
  defaultStartTime: string;
  defaultEndTime: string;
  professionalPassword: string;
  isActive: boolean;
  adminId: string;
  createdAt: Date;
  _count?: { professionals: number; days: number };
};

export type EventDayData = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  isActive: boolean;
  eventId: string;
};

export type BlackoutData = {
  id: string;
  startTime: string;
  endTime: string;
  description: string | null;
};

export type EventDayWithBlackouts = EventDayData & {
  blackouts: BlackoutData[];
};

export async function getEvents(): Promise<EventData[]> {
  await requireAdmin();

  const events = await db.event.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { professionals: true, days: true },
      },
    },
    take: 100,
  });

  return events as EventData[];
}

export async function getEventDays(eventId: string): Promise<EventDayWithBlackouts[]> {
  await requireAdmin();

  const days = await db.eventDay.findMany({
    where: { eventId, deletedAt: null },
    orderBy: { date: 'asc' },
    include: {
      blackouts: {
        where: { deletedAt: null },
        orderBy: { startTime: 'asc' },
        select: { id: true, startTime: true, endTime: true, description: true },
      },
    },
  });

  return days as EventDayWithBlackouts[];
}

/**
 * Generate an array of dates between startDate and endDate (inclusive).
 */
function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function createEvent(data: {
  name: string;
  description: string | null;
  startDate: string; // ISO string
  endDate: string; // ISO string
  defaultStartTime: string; // e.g. "09:00"
  defaultEndTime: string; // e.g. "17:00"
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

  const defaultStartTime = data.defaultStartTime || '09:00';
  const defaultEndTime = data.defaultEndTime || '17:00';

  try {
    const event = await db.event.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        startDate,
        endDate,
        defaultStartTime,
        defaultEndTime,
        professionalPassword: data.professionalPassword.trim(),
        adminId: admin.id,
      },
    });

    // Auto-generate EventDay records for each day in the range
    const dates = generateDateRange(startDate, endDate);
    for (const date of dates) {
      await db.eventDay.create({
        data: {
          eventId: event.id,
          date,
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          isActive: true,
        },
      });
    }

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
    defaultStartTime?: string;
    defaultEndTime?: string;
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
  if (data.defaultStartTime !== undefined) updateData.defaultStartTime = data.defaultStartTime;
  if (data.defaultEndTime !== undefined) updateData.defaultEndTime = data.defaultEndTime;
  if (data.professionalPassword !== undefined) updateData.professionalPassword = data.professionalPassword.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  try {
    await db.event.update({
      where: { id },
      data: updateData,
    });

    // If dates changed, regenerate EventDay records
    if (data.startDate !== undefined || data.endDate !== undefined) {
      const event = await db.event.findUnique({ where: { id } });
      if (event) {
        // Soft-delete existing days
        await db.eventDay.updateMany({
          where: { eventId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });

        // Generate new days
        const dates = generateDateRange(event.startDate, event.endDate);
        for (const date of dates) {
          await db.eventDay.create({
            data: {
              eventId: id,
              date,
              startTime: event.defaultStartTime,
              endTime: event.defaultEndTime,
              isActive: true,
            },
          });
        }
      }
    }

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

// ── Event Day Management ──

export async function updateEventDay(
  id: string,
  data: { startTime?: string; endTime?: string; isActive?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (data.startTime && !timeRegex.test(data.startTime)) {
      return { ok: false, error: 'Invalid start time format (HH:MM)' };
    }
    if (data.endTime && !timeRegex.test(data.endTime)) {
      return { ok: false, error: 'Invalid end time format (HH:MM)' };
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      return { ok: false, error: 'Start time must be before end time' };
    }

    await db.eventDay.update({
      where: { id, deletedAt: null },
      data: {
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[updateEventDay] Error:', msg);
    return { ok: false, error: 'Failed to update event day' };
  }
}

// ── Blackout Management ──

export async function createBlackout(data: {
  eventDayId: string;
  startTime: string;
  endTime: string;
  description?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(data.startTime)) {
      return { ok: false, error: 'Invalid start time format (HH:MM)' };
    }
    if (!timeRegex.test(data.endTime)) {
      return { ok: false, error: 'Invalid end time format (HH:MM)' };
    }
    if (data.startTime >= data.endTime) {
      return { ok: false, error: 'Start time must be before end time' };
    }

    // Verify the event day exists
    const eventDay = await db.eventDay.findUnique({
      where: { id: data.eventDayId, deletedAt: null },
    });
    if (!eventDay) {
      return { ok: false, error: 'Event day not found' };
    }

    const blackout = await db.eventDayBlackout.create({
      data: {
        eventDayId: data.eventDayId,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description || null,
      },
    });

    return { ok: true, id: blackout.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[createBlackout] Error:', msg);
    return { ok: false, error: 'Failed to create blackout' };
  }
}

export async function deleteBlackout(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    await db.eventDayBlackout.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[deleteBlackout] Error:', msg);
    return { ok: false, error: 'Failed to delete blackout' };
  }
}
