import { z, ZodError } from 'zod';
import { Role, BookingStatus } from '@/app/generated/prisma/enums';
import { db } from './db';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from './errors';

// Re-export error classes from errors.ts
export { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from './errors';

// Common validation schemas
export const timeRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
}).refine((data) => data.start < data.end, {
  message: 'Start time must be before end time',
  path: ['start'],
});

// Shift creation schema
export const createShiftSchema = timeRangeSchema.extend({
  resourceId: z.string().min(1, 'Resource ID is required'),
});

// Booking creation schema
export const createBookingSchema = timeRangeSchema.extend({
  clientId: z.string().min(1, 'Client ID is required'),
});

// Validation utilities
export async function validateProfessionalRole(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  if (user.role !== Role.PROFESSIONAL) {
    throw new BusinessRuleError(`User ${userId} must have role PROFESSIONAL to create shifts`);
  }
}

export async function validateResourceActive(resourceId: string): Promise<void> {
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { isActive: true, deletedAt: true },
  });

  if (!resource) {
    throw new NotFoundError(`Resource ${resourceId} not found`);
  }

  if (!resource.isActive || resource.deletedAt) {
    throw new BusinessRuleError(`Resource ${resourceId} is not available for shifts`);
  }
}

export async function validateClientRole(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  if (user.role !== Role.CLIENT) {
    throw new BusinessRuleError(`User ${userId} must have role CLIENT to create bookings`);
  }
}

// Time validation utilities
export function validate30MinuteInterval(start: Date, end: Date): void {
  const duration = end.getTime() - start.getTime();
  const thirtyMinutes = 30 * 60 * 1000;

  if (duration !== thirtyMinutes) {
    throw new ValidationError('Booking must be exactly 30 minutes', {
      start: start.toISOString(),
      end: end.toISOString(),
      duration: `${duration / (60 * 1000)} minutes`,
    });
  }
}

// Overlap detection helper
export async function findOverlappingShifts(
  professionalId: string,
  resourceId: string,
  start: Date,
  end: Date
): Promise<{ professionalOverlap: boolean; resourceOverlap: boolean }> {
  const overlappingShifts = await db.shift.findMany({
    where: {
      OR: [
        // Professional overlap
        {
          professionalId,
          deletedAt: null,
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } },
          ],
        },
        // Resource overlap
        {
          resourceId,
          deletedAt: null,
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } },
          ],
        },
      ],
    },
    select: {
      professionalId: true,
      resourceId: true,
    },
  });

  const professionalOverlap = overlappingShifts.some(
    (shift) => shift.professionalId === professionalId
  );
  const resourceOverlap = overlappingShifts.some(
    (shift) => shift.resourceId === resourceId
  );

  return { professionalOverlap, resourceOverlap };
}

// Schema validation helper
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        details[path] = err.message;
      });
      throw new ValidationError('Validation failed', details);
    }
    throw error;
  }
}