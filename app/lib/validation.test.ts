import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { Role } from '@/app/generated/prisma/enums'
import {
  createShiftSchema,
  createBookingSchema,
  validateProfessionalRole,
  validateResourceActive,
  validateClientRole,
  validate30MinuteInterval,
  findOverlappingShifts,
  validateSchema,
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from './validation'

// Mock the database module
vi.mock('./db', () => {
  // Create a mock delegate with common Prisma methods
  const createMockDelegate = () => ({
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  });

  return {
    db: {
      $transaction: vi.fn(),
      user: createMockDelegate(),
      resource: createMockDelegate(),
      shift: createMockDelegate(),
      booking: createMockDelegate(),
    },
  };
})

import { db } from './db'

describe('validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('schemas', () => {
    describe('createShiftSchema', () => {
      it('validates correct shift data', () => {
        const data = {
          start: new Date('2026-02-22T10:00:00Z'),
          end: new Date('2026-02-22T10:30:00Z'),
          resourceId: '123e4567-e89b-12d3-a456-426614174000',
        }

        const result = createShiftSchema.safeParse(data)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(data)
        }
      })

      it('rejects invalid UUID', () => {
        const data = {
          start: new Date('2026-02-22T10:00:00Z'),
          end: new Date('2026-02-22T10:30:00Z'),
          resourceId: 'not-a-uuid',
        }

        const result = createShiftSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('rejects end before start', () => {
        const data = {
          start: new Date('2026-02-22T11:00:00Z'),
          end: new Date('2026-02-22T10:30:00Z'),
          resourceId: '123e4567-e89b-12d3-a456-426614174000',
        }

        const result = createShiftSchema.safeParse(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Start time must be before end time')
        }
      })
    })

    describe('createBookingSchema', () => {
      it('validates correct booking data', () => {
        const data = {
          start: new Date('2026-02-22T10:00:00Z'),
          end: new Date('2026-02-22T10:30:00Z'),
          clientId: '123e4567-e89b-12d3-a456-426614174000',
        }

        const result = createBookingSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('validateProfessionalRole', () => {
    it('throws NotFoundError for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(validateProfessionalRole('nonexistent-id')).rejects.toThrow(NotFoundError)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
        select: { role: true },
      })
    })

    it('throws BusinessRuleError for non-professional user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ role: Role.CLIENT } as any)

      await expect(validateProfessionalRole('client-id')).rejects.toThrow(BusinessRuleError)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-id' },
        select: { role: true },
      })
    })

    it('does not throw for professional user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ role: Role.PROFESSIONAL } as any)

      await expect(validateProfessionalRole('professional-id')).resolves.toBeUndefined()
    })
  })

  describe('validateResourceActive', () => {
    it('throws NotFoundError for non-existent resource', async () => {
      vi.mocked(db.resource.findUnique).mockResolvedValue(null)

      await expect(validateResourceActive('nonexistent-id')).rejects.toThrow(NotFoundError)
      expect(db.resource.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
        select: { isActive: true, deletedAt: true },
      })
    })

    it('throws BusinessRuleError for inactive resource', async () => {
      vi.mocked(db.resource.findUnique).mockResolvedValue({ isActive: false, deletedAt: null } as any)

      await expect(validateResourceActive('inactive-id')).rejects.toThrow(BusinessRuleError)
    })

    it('throws BusinessRuleError for deleted resource', async () => {
      vi.mocked(db.resource.findUnique).mockResolvedValue({ isActive: true, deletedAt: new Date() } as any)

      await expect(validateResourceActive('deleted-id')).rejects.toThrow(BusinessRuleError)
    })

    it('does not throw for active, non-deleted resource', async () => {
      vi.mocked(db.resource.findUnique).mockResolvedValue({ isActive: true, deletedAt: null } as any)

      await expect(validateResourceActive('active-id')).resolves.toBeUndefined()
    })
  })

  describe('validateClientRole', () => {
    it('throws NotFoundError for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(validateClientRole('nonexistent-id')).rejects.toThrow(NotFoundError)
    })

    it('throws BusinessRuleError for non-client user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ role: Role.PROFESSIONAL } as any)

      await expect(validateClientRole('professional-id')).rejects.toThrow(BusinessRuleError)
    })

    it('does not throw for client user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ role: Role.CLIENT } as any)

      await expect(validateClientRole('client-id')).resolves.toBeUndefined()
    })
  })

  describe('validate30MinuteInterval', () => {
    it('does not throw for exactly 30 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:30:00Z')

      expect(() => validate30MinuteInterval(start, end)).not.toThrow()
    })

    it('throws ValidationError for less than 30 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:15:00Z')

      expect(() => validate30MinuteInterval(start, end)).toThrow(ValidationError)
    })

    it('throws ValidationError for more than 30 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T11:00:00Z')

      expect(() => validate30MinuteInterval(start, end)).toThrow(ValidationError)
    })

    it('includes duration details in error', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T11:00:00Z')

      try {
        validate30MinuteInterval(start, end)
      } catch (error) {
        const validationError = error as ValidationError
        expect(validationError).toBeInstanceOf(ValidationError)
        expect(validationError.details).toHaveProperty('duration')
        expect(validationError.details?.duration).toContain('minutes')
      }
    })
  })

  describe('findOverlappingShifts', () => {
    it('returns no overlap when no shifts exist', async () => {
      vi.mocked(db.shift.findMany).mockResolvedValue([])

      const result = await findOverlappingShifts(
        'professional-id',
        'resource-id',
        new Date('2026-02-22T10:00:00Z'),
        new Date('2026-02-22T10:30:00Z')
      )

      expect(result).toEqual({
        professionalOverlap: false,
        resourceOverlapCount: 0,
      })
    })

    it('detects professional overlap', async () => {
      vi.mocked(db.shift.findMany).mockResolvedValue([
        {
          id: 'shift-1',
          professionalId: 'professional-id',
          resourceId: 'other-resource',
          startTime: new Date('2026-02-22T10:00:00Z'),
          endTime: new Date('2026-02-22T10:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        },
      ] as any)

      const result = await findOverlappingShifts(
        'professional-id',
        'resource-id',
        new Date('2026-02-22T10:00:00Z'),
        new Date('2026-02-22T10:30:00Z')
      )

      expect(result).toEqual({
        professionalOverlap: true,
        resourceOverlapCount: 0,
      })
    })

    it('detects resource overlap', async () => {
      vi.mocked(db.shift.findMany).mockResolvedValue([
        {
          id: 'shift-2',
          professionalId: 'other-professional',
          resourceId: 'resource-id',
          startTime: new Date('2026-02-22T10:00:00Z'),
          endTime: new Date('2026-02-22T10:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        },
      ] as any)

      const result = await findOverlappingShifts(
        'professional-id',
        'resource-id',
        new Date('2026-02-22T10:00:00Z'),
        new Date('2026-02-22T10:30:00Z')
      )

      expect(result).toEqual({
        professionalOverlap: false,
        resourceOverlapCount: 1,
      })
    })

    it('detects both overlaps', async () => {
      vi.mocked(db.shift.findMany).mockResolvedValue([
        {
          id: 'shift-3',
          professionalId: 'professional-id',
          resourceId: 'other-resource',
          startTime: new Date('2026-02-22T10:00:00Z'),
          endTime: new Date('2026-02-22T10:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        },
        {
          id: 'shift-4',
          professionalId: 'other-professional',
          resourceId: 'resource-id',
          startTime: new Date('2026-02-22T10:00:00Z'),
          endTime: new Date('2026-02-22T10:30:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        },
      ] as any)

      const result = await findOverlappingShifts(
        'professional-id',
        'resource-id',
        new Date('2026-02-22T10:00:00Z'),
        new Date('2026-02-22T10:30:00Z')
      )

      expect(result).toEqual({
        professionalOverlap: true,
        resourceOverlapCount: 1,
      })
    })
  })

  describe('validateSchema', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    })

    it('returns validated data for valid input', () => {
      const input = { name: 'John', age: 30 }
      const result = validateSchema(testSchema, input)

      expect(result).toEqual(input)
    })

    it('throws ValidationError for invalid input', () => {
      const input = { name: '', age: -5 }

      expect(() => validateSchema(testSchema, input)).toThrow(ValidationError)
    })

    it('includes field errors in details', () => {
      const input = { name: '', age: -5 }

      try {
        validateSchema(testSchema, input)
      } catch (error) {
        const validationError = error as ValidationError
        expect(validationError).toBeInstanceOf(ValidationError)
        expect(validationError.details).toHaveProperty('name')
        expect(validationError.details).toHaveProperty('age')
      }
    })
  })
})