'use server';

import { db } from '@/app/lib/db';
import { getServerSession } from '@/app/lib/auth';
import { isValid30MinuteInterval, isAlignedTo30MinuteBoundary } from '@/app/lib/timeslot-utils';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  createShiftSchema,
  validateSchema,
  validateProfessionalRole,
  validateResourceActive,
  findOverlappingShifts,
} from '@/app/lib/validation';
import { Role } from '@/app/generated/prisma/enums';

/**
 * Create a shift (professional booking a resource)
 * @param resourceId The ID of the resource being booked
 * @param start Start time of the shift
 * @param end End time of the shift
 * @returns The created shift or throws an error
 */
export async function createShift(
  resourceId: string,
  start: Date,
  end: Date
) {
  // Get authenticated professional from session
  const session = await getServerSession();
  if (!session?.user) {
    throw new BusinessRuleError('Authentication required');
  }
  if (session.user.role !== Role.PROFESSIONAL) {
    throw new BusinessRuleError('Only professionals can create shifts');
  }
  const professionalId = session.user.id;

  // Validate input schema
  const input = validateSchema(createShiftSchema, {
    resourceId,
    start,
    end,
  });

  // Additional business rule validation
  if (!isValid30MinuteInterval(input.start, input.end)) {
    throw new ValidationError('Shift duration must be a multiple of 30 minutes');
  }

  if (!isAlignedTo30MinuteBoundary(input.start)) {
    throw new ValidationError('Shift start time must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)');
  }

  // Check professional role
  await validateProfessionalRole(professionalId);

  // Check resource active
  await validateResourceActive(input.resourceId);

  // Check for overlapping shifts (application-level check)
  const { professionalOverlap, resourceOverlap } = await findOverlappingShifts(
    professionalId,
    input.resourceId,
    input.start,
    input.end
  );

  if (professionalOverlap) {
    throw new ConflictError('Professional already has a shift during this time period');
  }

  if (resourceOverlap) {
    throw new ConflictError('Resource already booked for this time period');
  }

  // Create shift transactionally with re-checking constraints
  try {
    const shift = await db.$transaction(async (tx) => {
      // Re-check constraints within transaction to prevent race conditions
      const [professional, resource, overlappingShifts] = await Promise.all([
        tx.user.findUnique({
          where: { id: professionalId },
          select: { role: true },
        }),
        tx.resource.findUnique({
          where: { id: input.resourceId, deletedAt: null },
          select: { isActive: true },
        }),
        tx.shift.findMany({
          where: {
            deletedAt: null,
            OR: [
              {
                professionalId: professionalId,
                startTime: { lt: input.end },
                endTime: { gt: input.start },
              },
              {
                resourceId: input.resourceId,
                startTime: { lt: input.end },
                endTime: { gt: input.start },
              },
            ],
          },
          select: { id: true },
        }),
      ]);

      if (!professional || professional.role !== 'PROFESSIONAL') {
        throw new BusinessRuleError('Professional not found or invalid role');
      }

      if (!resource || !resource.isActive) {
        throw new BusinessRuleError('Resource not found or inactive');
      }

      if (overlappingShifts.length > 0) {
        throw new ConflictError('Overlapping shift detected (race condition)');
      }

      // Create the shift
      return await tx.shift.create({
        data: {
          startTime: input.start,
          endTime: input.end,
          professionalId: professionalId,
          resourceId: input.resourceId,
        },
        include: {
          professional: {
            select: { id: true, name: true, phoneNumber: true },
          },
          resource: {
            select: { id: true, name: true, description: true },
          },
        },
      });
    });

    return shift;
  } catch (error) {
    // Handle Prisma unique constraint violations
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      throw new ConflictError('Shift conflicts with existing shift (unique constraint violation)');
    }
    // Re-throw our custom errors
    if (
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof ConflictError ||
      error instanceof BusinessRuleError
    ) {
      throw error;
    }
    // Unknown error
    console.error('Failed to create shift:', error);
    throw new Error('Failed to create shift');
  }
}

/**
 * Get shifts for a professional
 * @param professionalId The professional's user ID
 * @param start Optional start date filter
 * @param end Optional end date filter
 * @returns Array of shifts
 */
export async function getProfessionalShifts(
  professionalId: string,
  start?: Date,
  end?: Date
) {
  const where: any = {
    professionalId,
    deletedAt: null,
  };

  if (start && end) {
    where.startTime = { gte: start };
    where.endTime = { lte: end };
  } else if (start) {
    where.startTime = { gte: start };
  } else if (end) {
    where.endTime = { lte: end };
  }

  return await db.shift.findMany({
    where,
    include: {
      resource: {
        select: { id: true, name: true, description: true, isActive: true },
      },
      bookings: {
        where: { deletedAt: null, status: 'CONFIRMED' },
        select: { id: true, startTime: true, endTime: true, clientId: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Cancel a shift (soft delete)
 * @param shiftId The shift to cancel
 * @returns The updated shift
 */
export async function cancelShift(shiftId: string) {
  // Get authenticated professional from session
  const session = await getServerSession();
  if (!session?.user) {
    throw new BusinessRuleError('Authentication required');
  }
  if (session.user.role !== Role.PROFESSIONAL) {
    throw new BusinessRuleError('Only professionals can cancel shifts');
  }
  const professionalId = session.user.id;

  const shift = await db.shift.findUnique({
    where: { id: shiftId, deletedAt: null },
    include: {
      bookings: {
        where: { deletedAt: null, status: 'CONFIRMED' },
        select: { id: true },
      },
    },
  });

  if (!shift) {
    throw new NotFoundError('Shift not found');
  }

  if (shift.professionalId !== professionalId) {
    throw new BusinessRuleError('Only the shift owner can cancel it');
  }

  if (shift.bookings.length > 0) {
    throw new BusinessRuleError('Cannot cancel shift with confirmed bookings');
  }

  return await db.shift.update({
    where: { id: shiftId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Get active resources available for shift creation
 * @returns Array of active resources
 */
export async function getActiveResources() {
  return await db.resource.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
  });
}