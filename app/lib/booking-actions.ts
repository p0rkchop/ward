'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';
import { generateTimeSlots, isAlignedTo30MinuteBoundary, timeRangesOverlap } from '@/app/lib/timeslot-utils';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  createBookingSchema,
  validateSchema,
  validateClientRole,
  validate30MinuteInterval,
} from '@/app/lib/validation';
import { sendBookingConfirmation, sendBookingCancellation, sendProfessionalNewBooking, sendProfessionalBookingCancelled } from '@/app/lib/email';
import { sendPushToUser } from '@/app/lib/push';
import type { ActionResult } from '@/app/lib/action-types';

// Maximum date range span allowed for timeslot queries (31 days).
// Prevents unbounded in-memory slot generation that could cause
// serverless function timeouts or excessive memory usage on Vercel.
const MAX_TIMESLOT_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * Returns the latest endDate among currently visible events, capped at 31 days.
 * Used by the client booking page to determine the timeslot query window.
 */
export async function getVisibleEventHorizon(): Promise<Date> {
  const now = new Date();
  const maxHorizon = new Date(now.getTime() + MAX_TIMESLOT_RANGE_MS);

  const activeEvents = await db.event.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      endDate: { gte: now },
    },
    select: { startDate: true, endDate: true, visibleDaysBefore: true },
  });

  let horizon = new Date();
  horizon.setDate(horizon.getDate() + 7); // Minimum 7-day window

  for (const e of activeEvents) {
    const visibilityDate = new Date(e.startDate);
    visibilityDate.setUTCDate(visibilityDate.getUTCDate() - e.visibleDaysBefore);
    if (now >= visibilityDate && e.endDate > horizon) {
      horizon = new Date(e.endDate);
    }
  }

  // Add 1 day buffer past endDate so the last day's timeslots are included
  horizon.setUTCDate(horizon.getUTCDate() + 1);

  return horizon > maxHorizon ? maxHorizon : horizon;
}

/**
 * Get available time slots with capacity count for a given date range
 * @param start Start date (inclusive)
 * @param end End date (exclusive)
 * @returns Array of time slots with available capacity
 */

export async function getAvailableTimeslots(start: Date, end: Date) {
  // Require authentication — only clients and admins should query available timeslots
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }

  if (end.getTime() - start.getTime() > MAX_TIMESLOT_RANGE_MS) {
    throw new Error('Date range must not exceed 31 days');
  }

  // Pre-fetch visible event IDs — an event is visible to clients if
  // today >= (event.startDate - visibleDaysBefore days)
  const now = new Date();
  const activeEvents = await db.event.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      endDate: { gte: start },
    },
    select: { id: true, startDate: true, visibleDaysBefore: true },
  });

  const visibleEventIds = activeEvents
    .filter((e) => {
      const visibilityDate = new Date(e.startDate);
      visibilityDate.setUTCDate(visibilityDate.getUTCDate() - e.visibleDaysBefore);
      return now >= visibilityDate;
    })
    .map((e) => e.id);

  if (visibleEventIds.length === 0) {
    return { allSlots: [], availableSlots: [] };
  }

  // Fetch all shifts that cover the date range
  // Only include shifts on resources that are assigned to visible active events
  const allShifts = await db.shift.findMany({
    where: {
      deletedAt: null,
      startTime: { lt: end },
      endTime: { gt: start },
      resource: {
        isActive: true,
        deletedAt: null,
        staffOnly: false,
        eventResources: {
          some: {
            deletedAt: null,
            eventId: { in: visibleEventIds },
          },
        },
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  // If no shifts exist, return empty — clients see nothing until professionals book
  if (allShifts.length === 0) {
    return { allSlots: [], availableSlots: [] };
  }

  // Generate 30-minute slots ONLY within shift time windows
  const slotSet = new Map<number, { start: Date; end: Date }>();
  for (const shift of allShifts) {
    // Clamp to query range
    const shiftStart = shift.startTime < start ? start : shift.startTime;
    const shiftEnd = shift.endTime > end ? end : shift.endTime;
    const slots = generateTimeSlots(shiftStart, shiftEnd);
    for (const slot of slots) {
      const key = slot.start.getTime();
      if (!slotSet.has(key)) {
        slotSet.set(key, slot);
      }
    }
  }

  // Sort slots by time
  const uniqueSlots = Array.from(slotSet.values()).sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  // Fetch ALL bookings within the date range (including cancelled ones)
  // because the unique constraint on (shiftId, startTime, endTime) means
  // cancelled bookings still occupy the slot and prevent new bookings.
  const allBookings = await db.booking.findMany({
    where: {
      startTime: { gte: start, lt: end },
      shift: {
        deletedAt: null,
      },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  // Process each slot using in-memory calculations
  const slotsWithCapacity = uniqueSlots.map(slot => {
    // Count shifts that cover this slot
    const shiftCount = allShifts.filter(shift =>
      shift.startTime < slot.end && shift.endTime > slot.start
    ).length;

    // Count bookings for this exact slot (exact time match)
    const bookingCount = allBookings.filter(
      booking => booking.startTime.getTime() === slot.start.getTime() &&
                booking.endTime.getTime() === slot.end.getTime()
    ).length;

    const availableCapacity = shiftCount - bookingCount;

    return {
      start: slot.start,
      end: slot.end,
      shiftCount,
      bookingCount,
      availableCapacity,
      isAvailable: availableCapacity > 0,
    };
  });

  // Filter out past slots and only show available ones for client UI
  const currentTime = new Date();
  const availableSlots = slotsWithCapacity.filter(slot => slot.isAvailable && slot.start > currentTime);

  return {
    allSlots: slotsWithCapacity,
    availableSlots,
  };
}

export type ClientEventBookingStatus = {
  eventId: string;
  eventName: string;
  allowMultiBooking: boolean;
  maxBookingsPerClient: number | null;
  existingBookingCount: number;
  existingBookingId: string | null; // first booking ID, for reschedule link
  hasReachedLimit: boolean;
};

/**
 * Get the client's booking status for each visible event.
 * Used by the booking page to show overlays when limits are reached.
 */
export async function getClientEventBookingStatus(): Promise<ClientEventBookingStatus[]> {
  const session = await getServerSession();
  if (!session?.user?.id) return [];

  const now = new Date();

  // Get visible events
  const events = await db.event.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      endDate: { gte: now },
      eventResources: {
        some: {
          deletedAt: null,
          resource: { isActive: true, deletedAt: null, staffOnly: false },
        },
      },
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      visibleDaysBefore: true,
      allowMultiBooking: true,
      maxBookingsPerClient: true,
    },
  });

  // Filter to visible events only
  const visibleEvents = events.filter((e) => {
    const visibilityDate = new Date(e.startDate);
    visibilityDate.setUTCDate(visibilityDate.getUTCDate() - e.visibleDaysBefore);
    return now >= visibilityDate;
  });

  const results: ClientEventBookingStatus[] = [];

  for (const event of visibleEvents) {
    const bookings = await db.booking.findMany({
      where: {
        clientId: session.user.id,
        deletedAt: null,
        status: 'CONFIRMED',
        shift: {
          deletedAt: null,
          resource: {
            eventResources: {
              some: { eventId: event.id, deletedAt: null },
            },
          },
        },
      },
      select: { id: true },
      take: 1,
    });

    const count = await db.booking.count({
      where: {
        clientId: session.user.id,
        deletedAt: null,
        status: 'CONFIRMED',
        shift: {
          deletedAt: null,
          resource: {
            eventResources: {
              some: { eventId: event.id, deletedAt: null },
            },
          },
        },
      },
    });

    const hasReachedLimit = !event.allowMultiBooking
      ? count >= 1
      : event.maxBookingsPerClient
        ? count >= event.maxBookingsPerClient
        : false;

    results.push({
      eventId: event.id,
      eventName: event.name,
      allowMultiBooking: event.allowMultiBooking,
      maxBookingsPerClient: event.maxBookingsPerClient,
      existingBookingCount: count,
      existingBookingId: bookings[0]?.id ?? null,
      hasReachedLimit,
    });
  }

  return results;
}

/**
 * Book a time slot (auto-match a professional)
 * clientId is derived from the authenticated session — not accepted from the client.
 * @param start Start time of the slot (must align with 30-minute interval)
 * @param end End time of the slot (must be start + 30 minutes)
 * @returns ActionResult with the created booking or a structured error
 */
export async function bookTimeslot(_clientId: string, start: Date, end: Date, notes?: string): Promise<ActionResult<Awaited<ReturnType<typeof db.booking.create>>>> {
  try {
  // Derive clientId from server session to prevent IDOR
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required', code: 'BUSINESS_RULE' };
  }
  const clientId = session.user.id;

  // Validate input schema
  const input = validateSchema(createBookingSchema, { clientId, start, end });

  // Validate 30-minute exact interval and alignment
  validate30MinuteInterval(input.start, input.end);

  if (!isAlignedTo30MinuteBoundary(input.start)) {
    throw new ValidationError('Booking start time must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)');
  }

  // Prevent booking in the past
  if (input.start < new Date()) {
    throw new BusinessRuleError('Cannot book a timeslot in the past');
  }

  // Validate notes length
  const trimmedNotes = notes?.trim() || null;
  if (trimmedNotes && trimmedNotes.length > 250) {
    throw new ValidationError('Notes must be 250 characters or fewer');
  }

  // Check client role
  await validateClientRole(input.clientId);

  // Check multi-booking limits across all events the timeslot could belong to
  // Find events that have resources with shifts covering this timeslot
  const relevantEvents = await db.event.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      eventResources: {
        some: {
          deletedAt: null,
          resource: {
            isActive: true,
            deletedAt: null,
            staffOnly: false,
            shifts: {
              some: {
                deletedAt: null,
                startTime: { lte: input.start },
                endTime: { gte: input.end },
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      allowMultiBooking: true,
      maxBookingsPerClient: true,
    },
  });

  for (const event of relevantEvents) {
    // Count existing confirmed bookings for this client in this event
    const existingCount = await db.booking.count({
      where: {
        clientId: input.clientId,
        deletedAt: null,
        status: 'CONFIRMED',
        shift: {
          deletedAt: null,
          resource: {
            eventResources: {
              some: {
                eventId: event.id,
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!event.allowMultiBooking && existingCount >= 1) {
      throw new BusinessRuleError('You already have a booking for this event. Cancel your existing booking first, or ask the event admin to enable multiple bookings.');
    }

    if (event.allowMultiBooking && event.maxBookingsPerClient && existingCount >= event.maxBookingsPerClient) {
      throw new BusinessRuleError(`You have reached the maximum of ${event.maxBookingsPerClient} booking${event.maxBookingsPerClient !== 1 ? 's' : ''} for this event.`);
    }
  }

  // Auto-matching algorithm with concurrency handling
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const booking = await db.$transaction(async (tx) => {
        // Step 1: Find available shifts for the requested timeslot
        // Only consider shifts on resources assigned to active events
        const availableShifts = await tx.shift.findMany({
          where: {
            deletedAt: null,
            startTime: { lte: input.start },
            endTime: { gte: input.end },
            resource: {
              isActive: true,
              deletedAt: null,
              staffOnly: false,
              eventResources: {
                some: {
                  deletedAt: null,
                  event: {
                    isActive: true,
                    deletedAt: null,
                  },
                },
              },
            },
          },
          include: {
            resource: {
              select: { id: true, name: true, isActive: true },
            },
            professional: {
              select: { id: true, name: true, phoneNumber: true },
            },
            bookings: {
              where: {
                startTime: input.start,
                endTime: input.end,
              },
              select: { id: true, status: true, deletedAt: true },
            },
          },
        });

        // Filter shifts with available capacity
        // Exclude shifts that have ANY booking row (even cancelled) at this exact time
        // because a unique constraint on (shiftId, startTime, endTime) prevents duplicates.
        const shiftsWithCapacity = availableShifts.filter((shift) => {
          return shift.bookings.length === 0;
        });

        if (shiftsWithCapacity.length === 0) {
          throw new BusinessRuleError('No available professionals for the requested timeslot');
        }

        // Step 2: Random selection from available shifts
        const randomIndex = Math.floor(Math.random() * shiftsWithCapacity.length);
        const selectedShift = shiftsWithCapacity[randomIndex];

        // Step 3: Re-check within transaction — any row (including cancelled)
        // would violate the unique constraint on (shiftId, startTime, endTime)
        const existingBookingCount = await tx.booking.count({
          where: {
            shiftId: selectedShift.id,
            startTime: input.start,
            endTime: input.end,
          },
        });

        if (existingBookingCount >= 1) {
          throw new ConflictError('Slot unavailable (unique constraint)');
        }

        // Step 4: Create the booking
        return await tx.booking.create({
          data: {
            startTime: input.start,
            endTime: input.end,
            clientId: input.clientId,
            shiftId: selectedShift.id,
            status: 'CONFIRMED',
            notes: trimmedNotes,
          },
          include: {
            client: {
              select: { id: true, name: true, phoneNumber: true, email: true, notifyViaEmail: true, notifyViaPush: true },
            },
            shift: {
              include: {
                professional: {
                  select: { id: true, name: true, phoneNumber: true, email: true, notifyViaEmail: true, notifyViaPush: true },
                },
                resource: {
                  select: { id: true, name: true, description: true, location: true },
                },
              },
            },
          },
        });
      });

      const emailData = {
        startTime: booking.startTime,
        endTime: booking.endTime,
        professionalName: booking.shift.professional.name ?? 'TBD',
        resourceName: booking.shift.resource.name,
        resourceLocation: booking.shift.resource.location,
      };

      // Fire-and-forget: send confirmation email if client has an email on file
      if (booking.client.email && booking.client.notifyViaEmail) {
        sendBookingConfirmation(booking.client.email, emailData).catch(() => {});
      }

      // Fire-and-forget: push notification to client
      if (booking.client.notifyViaPush) {
        sendPushToUser(booking.client.id, {
          title: 'Booking Confirmed',
          body: `Your appointment with ${emailData.professionalName} is confirmed.`,
          url: '/client/appointments',
        }).catch(() => {});
      }

      // Fire-and-forget: notify professional of new booking
      if (booking.shift.professional.email && booking.shift.professional.notifyViaEmail) {
        sendProfessionalNewBooking(
          booking.shift.professional.email,
          booking.client.name ?? 'Client',
          emailData,
        ).catch(() => {});
      }

      // Fire-and-forget: push notification to professional
      if (booking.shift.professional.notifyViaPush) {
        sendPushToUser(booking.shift.professional.id, {
          title: 'New Booking',
          body: `${booking.client.name ?? 'A client'} booked an appointment with you.`,
          url: '/professional/bookings',
        }).catch(() => {});
      }

      return { success: true as const, data: booking };
    } catch (error) {
      lastError = error as Error;

      // If it's a conflict error and we have retries left, continue
      if (error instanceof ConflictError && attempt < maxRetries - 1) {
        // Wait a small random delay before retry to reduce collision probability
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
        continue;
      }

      // Re-throw our custom errors so the outer catch can map them
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof BusinessRuleError ||
        error instanceof ConflictError
      ) {
        throw error;
      }

      // Handle Prisma unique constraint violations
      if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        throw new ConflictError('Booking conflicts with existing booking (unique constraint violation)');
      }

      // Unknown error or max retries exceeded
      break;
    }
  }

  // If we get here, all retries failed
  console.error('Failed to create booking after retries:', lastError);
  throw new Error('Failed to create booking. Please try again.');
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message, code: 'VALIDATION' };
    }
    if (error instanceof ConflictError) {
      return { success: false, error: error.message, code: 'CONFLICT' };
    }
    if (error instanceof BusinessRuleError) {
      return { success: false, error: error.message, code: 'BUSINESS_RULE' };
    }
    if (error instanceof NotFoundError) {
      return { success: false, error: error.message, code: 'NOT_FOUND' };
    }
    const msg = error instanceof Error ? error.message : 'Failed to book appointment';
    return { success: false, error: msg, code: 'UNKNOWN' };
  }
}

/**
 * Get bookings for a professional (bookings on their shifts)
 * @param professionalId The professional's user ID
 * @param start Optional start date filter
 * @param end Optional end date filter
 * @returns Array of bookings on the professional's shifts
 */
export async function getProfessionalBookings(
  professionalId: string,
  start?: Date,
  end?: Date
) {
  // Enforce that the caller is the professional themselves or an admin
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  if (session.user.role === 'PROFESSIONAL' && session.user.id !== professionalId) {
    throw new BusinessRuleError('You can only view your own bookings');
  }
  if (session.user.role === 'CLIENT') {
    throw new BusinessRuleError('Clients cannot access professional bookings');
  }

  const where: any = {
    shift: {
      professionalId,
      deletedAt: null,
    },
    deletedAt: null,
    status: 'CONFIRMED',
  };

  if (start && end) {
    where.startTime = { gte: start, lte: end };
  } else if (start) {
    where.startTime = { gte: start };
  } else if (end) {
    where.startTime = { lte: end };
  }

  return await db.booking.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true, phoneNumber: true },
      },
      shift: {
        include: {
          resource: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Get bookings for a client
 * @param clientId The client's user ID
 * @param start Optional start date filter
 * @param end Optional end date filter
 * @returns Array of bookings for the client
 */
export async function getClientBookings(
  clientId: string,
  start?: Date,
  end?: Date
) {
  // Enforce that the caller is the client themselves or an admin
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  if (session.user.role === 'CLIENT' && session.user.id !== clientId) {
    throw new BusinessRuleError('You can only view your own bookings');
  }
  if (session.user.role === 'PROFESSIONAL') {
    throw new BusinessRuleError('Professionals cannot access client booking lists');
  }

  const where: any = {
    clientId,
    deletedAt: null,
    status: 'CONFIRMED',
  };

  if (start && end) {
    where.startTime = { gte: start, lte: end };
  } else if (start) {
    where.startTime = { gte: start };
  } else if (end) {
    where.startTime = { lte: end };
  }

  return await db.booking.findMany({
    where,
    include: {
      shift: {
        include: {
          professional: {
            select: { id: true, name: true },
          },
          resource: {
            select: { id: true, name: true, description: true, location: true },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Cancel a booking
 * clientId is derived from the authenticated session — not accepted from the client.
 * @param bookingId The booking ID to cancel
 * @returns ActionResult with the cancelled booking or a structured error
 */
export async function cancelBooking(bookingId: string, _clientId?: string): Promise<ActionResult<{ id: string }>> {
  try {
    // Derive clientId from server session to prevent IDOR
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', code: 'BUSINESS_RULE' };
    }
    const clientId = session.user.id;

    // First, verify the booking exists and belongs to the client
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        shift: {
          select: { startTime: true, endTime: true },
        },
      },
    });

    if (!booking) {
      return { success: false, error: `Booking ${bookingId} not found`, code: 'NOT_FOUND' };
    }

    if (booking.clientId !== clientId) {
      return { success: false, error: 'You can only cancel your own bookings', code: 'BUSINESS_RULE' };
    }

    if (booking.deletedAt) {
      return { success: false, error: 'Booking is already cancelled', code: 'BUSINESS_RULE' };
    }

    // Check if booking is in the past
    const now = new Date();
    if (new Date(booking.startTime) < now) {
      return { success: false, error: 'Cannot cancel past bookings', code: 'BUSINESS_RULE' };
    }

    // Read full booking data for notifications before deleting
    const fullBooking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: {
          select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true },
        },
        shift: {
          include: {
            professional: {
              select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true },
            },
            resource: {
              select: { id: true, name: true, description: true, location: true },
            },
          },
        },
      },
    });

    if (!fullBooking) {
      return { success: false, error: `Booking ${bookingId} not found`, code: 'NOT_FOUND' };
    }

    // Hard-delete the booking so the unique constraint slot is freed
    await db.booking.delete({ where: { id: bookingId } });

    const cancelEmailData = {
      startTime: fullBooking.startTime,
      endTime: fullBooking.endTime,
      professionalName: fullBooking.shift.professional.name ?? 'TBD',
      resourceName: fullBooking.shift.resource.name,
      resourceLocation: fullBooking.shift.resource.location,
    };

    // Fire-and-forget: send cancellation email if client has an email on file
    if (fullBooking.client?.email && fullBooking.client.notifyViaEmail) {
      sendBookingCancellation(fullBooking.client.email, cancelEmailData).catch(() => {});
    }

    // Fire-and-forget: push notification to client
    if (fullBooking.client?.notifyViaPush) {
      sendPushToUser(fullBooking.client.id, {
        title: 'Booking Cancelled',
        body: `Your appointment with ${cancelEmailData.professionalName} has been cancelled.`,
        url: '/client/appointments',
      }).catch(() => {});
    }

    // Fire-and-forget: notify professional that a slot freed up
    if (fullBooking.shift.professional.email && fullBooking.shift.professional.notifyViaEmail) {
      sendProfessionalBookingCancelled(
        fullBooking.shift.professional.email,
        fullBooking.client?.name ?? 'Client',
        cancelEmailData,
        'client',
      ).catch(() => {});
    }

    // Fire-and-forget: push notification to professional
    if (fullBooking.shift.professional.notifyViaPush) {
      sendPushToUser(fullBooking.shift.professional.id, {
        title: 'Booking Cancelled',
        body: `${fullBooking.client?.name ?? 'A client'} cancelled their appointment.`,
        url: '/professional/bookings',
      }).catch(() => {});
    }

    return { success: true, data: { id: bookingId } };
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    const msg = error instanceof Error ? error.message : 'Failed to cancel booking';
    return { success: false, error: msg, code: 'UNKNOWN' };
  }
}

/**
 * Reschedule a booking: atomically cancels the old booking and creates a new one.
 * This bypasses multi-booking limits since the old booking is cancelled first within
 * the same logical operation.
 */
export async function rescheduleBooking(
  bookingId: string,
  newStart: Date,
  newEnd: Date,
  notes?: string,
): Promise<ActionResult<Awaited<ReturnType<typeof db.booking.create>>>> {
  try {
  // Derive clientId from server session
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required', code: 'BUSINESS_RULE' };
  }
  const clientId = session.user.id;

  // Validate the new timeslot
  const input = validateSchema(createBookingSchema, { clientId, start: newStart, end: newEnd });
  validate30MinuteInterval(input.start, input.end);

  if (!isAlignedTo30MinuteBoundary(input.start)) {
    throw new ValidationError('Booking start time must be aligned to 30-minute boundaries');
  }

  if (input.start < new Date()) {
    throw new BusinessRuleError('Cannot reschedule to a timeslot in the past');
  }

  const trimmedNotes = notes?.trim() || null;
  if (trimmedNotes && trimmedNotes.length > 250) {
    throw new ValidationError('Notes must be 250 characters or fewer');
  }

  // Verify the existing booking
  const existingBooking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
      shift: {
        include: {
          professional: { select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
          resource: { select: { id: true, name: true, description: true, location: true } },
        },
      },
    },
  });

  if (!existingBooking) {
    throw new NotFoundError('Booking not found');
  }

  if (existingBooking.clientId !== clientId) {
    throw new BusinessRuleError('You can only reschedule your own bookings');
  }

  if (existingBooking.deletedAt || existingBooking.status === 'CANCELLED') {
    throw new BusinessRuleError('Cannot reschedule a cancelled booking');
  }

  if (new Date(existingBooking.startTime) < new Date()) {
    throw new BusinessRuleError('Cannot reschedule a past booking');
  }

  // Cancel old + create new in a transaction
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const newBooking = await db.$transaction(async (tx) => {
        // Hard-delete the old booking to free the unique constraint slot
        await tx.booking.delete({ where: { id: bookingId } });

        // Find available shifts for the new timeslot
        const availableShifts = await tx.shift.findMany({
          where: {
            deletedAt: null,
            startTime: { lte: input.start },
            endTime: { gte: input.end },
            resource: {
              isActive: true,
              deletedAt: null,
              staffOnly: false,
              eventResources: {
                some: {
                  deletedAt: null,
                  event: { isActive: true, deletedAt: null },
                },
              },
            },
          },
          include: {
            resource: { select: { id: true, name: true, isActive: true } },
            professional: { select: { id: true, name: true, phoneNumber: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
            bookings: {
              where: { startTime: input.start, endTime: input.end },
              select: { id: true },
            },
          },
        });

        // Exclude shifts with ANY booking row at this time (unique constraint)
        const shiftsWithCapacity = availableShifts.filter((s) => s.bookings.length === 0);

        if (shiftsWithCapacity.length === 0) {
          throw new BusinessRuleError('No available professionals for the requested timeslot');
        }

        const randomIndex = Math.floor(Math.random() * shiftsWithCapacity.length);
        const selectedShift = shiftsWithCapacity[randomIndex];

        // Re-check — any row would violate unique constraint
        const existingBookingCount = await tx.booking.count({
          where: {
            shiftId: selectedShift.id,
            startTime: input.start,
            endTime: input.end,
          },
        });

        if (existingBookingCount >= 1) {
          throw new ConflictError('Slot unavailable (unique constraint)');
        }

        return await tx.booking.create({
          data: {
            startTime: input.start,
            endTime: input.end,
            clientId: input.clientId,
            shiftId: selectedShift.id,
            status: 'CONFIRMED',
            notes: trimmedNotes,
          },
          include: {
            client: { select: { id: true, name: true, phoneNumber: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
            shift: {
              include: {
                professional: { select: { id: true, name: true, phoneNumber: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
                resource: { select: { id: true, name: true, description: true, location: true } },
              },
            },
          },
        });
      });

      // Notifications for the new booking
      const emailData = {
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
        professionalName: newBooking.shift.professional.name ?? 'TBD',
        resourceName: newBooking.shift.resource.name,
        resourceLocation: newBooking.shift.resource.location,
      };

      if (newBooking.client.email && newBooking.client.notifyViaEmail) {
        sendBookingConfirmation(newBooking.client.email, emailData).catch(() => {});
      }
      if (newBooking.client.notifyViaPush) {
        sendPushToUser(newBooking.client.id, {
          title: 'Booking Rescheduled',
          body: `Your appointment has been rescheduled with ${emailData.professionalName}.`,
          url: '/client/appointments',
        }).catch(() => {});
      }

      // Notify old professional if different from new
      if (existingBooking.shift.professional.id !== newBooking.shift.professional.id) {
        if (existingBooking.shift.professional.email && existingBooking.shift.professional.notifyViaEmail) {
          sendProfessionalBookingCancelled(
            existingBooking.shift.professional.email,
            existingBooking.client?.name ?? 'Client',
            {
              startTime: existingBooking.startTime,
              endTime: existingBooking.endTime,
              professionalName: existingBooking.shift.professional.name ?? 'TBD',
              resourceName: existingBooking.shift.resource.name,
              resourceLocation: existingBooking.shift.resource.location,
            },
            'client',
          ).catch(() => {});
        }
      }

      // Notify new professional
      if (newBooking.shift.professional.email && newBooking.shift.professional.notifyViaEmail) {
        sendProfessionalNewBooking(
          newBooking.shift.professional.email,
          newBooking.client.name ?? 'Client',
          emailData,
        ).catch(() => {});
      }
      if (newBooking.shift.professional.notifyViaPush) {
        sendPushToUser(newBooking.shift.professional.id, {
          title: 'New Booking',
          body: `${newBooking.client.name ?? 'A client'} booked an appointment with you.`,
          url: '/professional/bookings',
        }).catch(() => {});
      }

      return { success: true as const, data: newBooking };
    } catch (error) {
      lastError = error as Error;
      if (error instanceof ConflictError && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
        continue;
      }
      throw error;
    }
  }

  console.error('Failed to reschedule booking after retries:', lastError);
  throw lastError;
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message, code: 'VALIDATION' };
    }
    if (error instanceof ConflictError) {
      return { success: false, error: error.message, code: 'CONFLICT' };
    }
    if (error instanceof BusinessRuleError) {
      return { success: false, error: error.message, code: 'BUSINESS_RULE' };
    }
    if (error instanceof NotFoundError) {
      return { success: false, error: error.message, code: 'NOT_FOUND' };
    }
    const msg = error instanceof Error ? error.message : 'Failed to reschedule booking';
    return { success: false, error: msg, code: 'UNKNOWN' };
  }
}