'use server';

import { db } from '@/app/lib/db';
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

/**
 * Get available time slots with capacity count for a given date range
 * @param start Start date (inclusive)
 * @param end End date (exclusive)
 * @returns Array of time slots with available capacity
 */
export async function getAvailableTimeslots(start: Date, end: Date) {
  // Validate input
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }

  // Generate 30-minute time slots in JavaScript
  // This is simpler than SQLite recursive CTE for MVP
  const slots = generateTimeSlots(start, end);

  // Batch fetch all relevant shifts and bookings in 2 queries instead of 2*N queries
  // Fetch all shifts that could potentially cover any slot in the date range
  const allShifts = await db.shift.findMany({
    where: {
      deletedAt: null,
      startTime: { lt: end }, // shift starts before overall end
      endTime: { gt: start }, // shift ends after overall start
      resource: {
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  // Fetch all confirmed bookings within the date range
  const allBookings = await db.booking.findMany({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
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
  const slotsWithCapacity = slots.map(slot => {
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

  // Filter to only available slots for client UI
  const availableSlots = slotsWithCapacity.filter(slot => slot.isAvailable);

  return {
    allSlots: slotsWithCapacity,
    availableSlots,
  };
}

/**
 * Book a time slot (auto-match a professional)
 * @param clientId The ID of the client making the booking
 * @param start Start time of the slot (must align with 30-minute interval)
 * @param end End time of the slot (must be start + 30 minutes)
 * @returns The created booking or error
 */
export async function bookTimeslot(clientId: string, start: Date, end: Date) {
  // Validate input schema
  const input = validateSchema(createBookingSchema, { clientId, start, end });

  // Validate 30-minute exact interval and alignment
  validate30MinuteInterval(input.start, input.end);

  if (!isAlignedTo30MinuteBoundary(input.start)) {
    throw new ValidationError('Booking start time must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)');
  }

  // Check client role
  await validateClientRole(input.clientId);

  // Auto-matching algorithm with concurrency handling
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const booking = await db.$transaction(async (tx) => {
        // Step 1: Find available shifts for the requested timeslot
        const availableShifts = await tx.shift.findMany({
          where: {
            deletedAt: null,
            startTime: { lte: input.start },
            endTime: { gte: input.end },
            resource: {
              isActive: true,
              deletedAt: null,
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
                deletedAt: null,
                status: 'CONFIRMED',
                startTime: input.start,
                endTime: input.end,
              },
              select: { id: true },
            },
          },
        });

        // Filter shifts with available capacity
        const shiftsWithCapacity = availableShifts.filter((shift) => {
          // Count bookings for this exact timeslot (already filtered by start/end)
          const bookingCount = shift.bookings.length;
          // For simplicity, assume each shift has capacity of 1 (one professional)
          // In a real system, shift might have capacity >1 (e.g., group sessions)
          const shiftCapacity = 1;
          return bookingCount < shiftCapacity;
        });

        if (shiftsWithCapacity.length === 0) {
          throw new BusinessRuleError('No available professionals for the requested timeslot');
        }

        // Step 2: Random selection from available shifts
        const randomIndex = Math.floor(Math.random() * shiftsWithCapacity.length);
        const selectedShift = shiftsWithCapacity[randomIndex];

        // Step 3: Re-check capacity within transaction to prevent race conditions
        const existingBookingCount = await tx.booking.count({
          where: {
            shiftId: selectedShift.id,
            deletedAt: null,
            status: 'CONFIRMED',
            startTime: input.start,
            endTime: input.end,
          },
        });

        if (existingBookingCount >= 1) {
          // Capacity taken by concurrent booking, throw to trigger retry
          throw new ConflictError('Capacity taken by concurrent booking');
        }

        // Step 4: Create the booking
        return await tx.booking.create({
          data: {
            startTime: input.start,
            endTime: input.end,
            clientId: input.clientId,
            shiftId: selectedShift.id,
            status: 'CONFIRMED',
          },
          include: {
            client: {
              select: { id: true, name: true, phoneNumber: true },
            },
            shift: {
              include: {
                professional: {
                  select: { id: true, name: true, phoneNumber: true },
                },
                resource: {
                  select: { id: true, name: true, description: true },
                },
              },
            },
          },
        });
      });

      return booking;
    } catch (error) {
      lastError = error as Error;

      // If it's a conflict error and we have retries left, continue
      if (error instanceof ConflictError && attempt < maxRetries - 1) {
        // Wait a small random delay before retry to reduce collision probability
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
        continue;
      }

      // Re-throw our custom errors
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof BusinessRuleError
      ) {
        throw error;
      }

      // Handle Prisma unique constraint violations
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictError('Booking conflicts with existing booking (unique constraint violation)');
      }

      // Unknown error or max retries exceeded
      break;
    }
  }

  // If we get here, all retries failed
  console.error('Failed to create booking after retries:', lastError);
  throw new Error('Failed to create booking. Please try again.');
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
            select: { id: true, name: true, phoneNumber: true },
          },
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
 * Cancel a booking
 * @param bookingId The booking ID to cancel
 * @param clientId The client's user ID (for authorization)
 * @returns The updated booking
 */
export async function cancelBooking(bookingId: string, clientId: string) {
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
    throw new NotFoundError(`Booking ${bookingId} not found`);
  }

  if (booking.clientId !== clientId) {
    throw new BusinessRuleError('You can only cancel your own bookings');
  }

  if (booking.deletedAt) {
    throw new BusinessRuleError('Booking is already cancelled');
  }

  // Check if booking is in the past
  const now = new Date();
  if (new Date(booking.startTime) < now) {
    throw new BusinessRuleError('Cannot cancel past bookings');
  }

  // Soft delete the booking
  const updatedBooking = await db.booking.update({
    where: { id: bookingId },
    data: {
      deletedAt: new Date(),
    },
    include: {
      shift: {
        include: {
          professional: {
            select: { id: true, name: true, phoneNumber: true },
          },
          resource: {
            select: { id: true, name: true, description: true },
          },
        },
      },
    },
  });

  return updatedBooking;
}