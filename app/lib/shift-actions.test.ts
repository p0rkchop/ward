import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@/app/generated/prisma/enums'
import { createShift, getProfessionalShifts, cancelShift, getActiveResources } from './shift-actions'

// Mock dependencies
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

vi.mock('./auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('./validation', () => ({
  ValidationError: class ValidationError extends Error {
    code = 'VALIDATION_ERROR'
    details?: Record<string, string>
  },
  NotFoundError: class NotFoundError extends Error {
    code = 'NOT_FOUND'
  },
  ConflictError: class ConflictError extends Error {
    code = 'CONFLICT'
  },
  BusinessRuleError: class BusinessRuleError extends Error {
    code = 'BUSINESS_RULE_VIOLATION'
  },
  createShiftSchema: { safeParse: vi.fn() },
  validateSchema: vi.fn(),
  validateProfessionalRole: vi.fn(),
  validateResourceActive: vi.fn(),
  findOverlappingShifts: vi.fn(),
}))

vi.mock('./timeslot-utils', () => ({
  isValid30MinuteInterval: vi.fn(),
  isAlignedTo30MinuteBoundary: vi.fn(),
}))

import { db } from './db'
import { getServerSession } from './auth'
import { validateSchema, validateProfessionalRole, validateResourceActive, findOverlappingShifts } from './validation'
import { isValid30MinuteInterval, isAlignedTo30MinuteBoundary } from './timeslot-utils'

describe('shift-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default session mock
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'professional-id',
        role: Role.PROFESSIONAL,
        name: 'Test Professional',
        phoneNumber: '+1234567890',
        setupComplete: true,
        isNewUser: false,
      },
      expires: new Date().toISOString(),
    })
  })

  describe('createShift', () => {
    const mockResourceId = 'resource-id'
    const mockStart = new Date('2026-02-22T10:00:00Z')
    const mockEnd = new Date('2026-02-22T10:30:00Z')

    it('creates shift successfully with valid input', async () => {
      // Mock validation
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(true)
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateProfessionalRole).mockResolvedValue(undefined)
      vi.mocked(validateResourceActive).mockResolvedValue(undefined)
      vi.mocked(findOverlappingShifts).mockResolvedValue({
        professionalOverlap: false,
        resourceOverlap: false,
      })

      // Mock transaction
      const mockShift = {
        id: 'shift-id',
        startTime: mockStart,
        endTime: mockEnd,
        professionalId: 'professional-id',
        resourceId: mockResourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
        resource: { id: 'resource-id', name: 'Test Resource', description: 'Test Description' },
      }
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return await callback({
          user: {
            findUnique: vi.fn().mockResolvedValue({ role: Role.PROFESSIONAL }),
          },
          resource: {
            findUnique: vi.fn().mockResolvedValue({ isActive: true }),
          },
          shift: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue(mockShift),
          },
        } as any)
      })

      const result = await createShift(mockResourceId, mockStart, mockEnd)

      expect(result).toEqual(mockShift)
      expect(validateSchema).toHaveBeenCalled()
      expect(isValid30MinuteInterval).toHaveBeenCalledWith(mockStart, mockEnd)
      expect(isAlignedTo30MinuteBoundary).toHaveBeenCalledWith(mockStart)
      expect(validateProfessionalRole).toHaveBeenCalledWith('professional-id')
      expect(validateResourceActive).toHaveBeenCalledWith(mockResourceId)
      expect(findOverlappingShifts).toHaveBeenCalledWith(
        'professional-id',
        mockResourceId,
        mockStart,
        mockEnd
      )
    })

    it('throws BusinessRuleError when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Authentication required')
    })

    it('throws BusinessRuleError when user is not a professional', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'client-id',
          role: Role.CLIENT,
          name: 'Test Client',
          phoneNumber: '+1234567890',
          setupComplete: true,
          isNewUser: false,
        },
        expires: new Date().toISOString(),
      })

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Only professionals can create shifts')
    })

    it('throws ValidationError for invalid 30-minute interval', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(false)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Shift duration must be a multiple of 30 minutes')
    })

    it('throws ValidationError for misaligned start time', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(true)
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(false)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Shift start time must be aligned to 30-minute boundaries')
    })

    it('throws ConflictError for professional overlap', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(true)
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateProfessionalRole).mockResolvedValue(undefined)
      vi.mocked(validateResourceActive).mockResolvedValue(undefined)
      vi.mocked(findOverlappingShifts).mockResolvedValue({
        professionalOverlap: true,
        resourceOverlap: false,
      })

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Professional already has a shift during this time period')
    })

    it('throws ConflictError for resource overlap', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(findOverlappingShifts).mockResolvedValue({
        professionalOverlap: false,
        resourceOverlap: true,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(true)
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateProfessionalRole).mockResolvedValue(undefined)
      vi.mocked(validateResourceActive).mockResolvedValue(undefined)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Resource already booked for this time period')
    })
  })

  describe('getProfessionalShifts', () => {
    it('returns shifts for professional with date filters', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          startTime: new Date('2026-02-22T10:00:00Z'),
          endTime: new Date('2026-02-22T10:30:00Z'),
          professionalId: 'professional-id',
          resourceId: 'resource-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          resource: {
            id: 'resource-id',
            name: 'Test Resource',
            description: 'Test Description',
            isActive: true,
          },
          bookings: [],
        },
      ]
      vi.mocked(db.shift.findMany).mockResolvedValue(mockShifts)

      const start = new Date('2026-02-22T00:00:00Z')
      const end = new Date('2026-02-23T00:00:00Z')
      const result = await getProfessionalShifts('professional-id', start, end)

      expect(result).toEqual(mockShifts)
      expect(db.shift.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'professional-id',
          deletedAt: null,
          startTime: { gte: start },
          endTime: { lte: end },
        },
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
      })
    })

    it('returns shifts without date filters', async () => {
      vi.mocked(db.shift.findMany).mockResolvedValue([])

      const result = await getProfessionalShifts('professional-id')

      expect(result).toEqual([])
      expect(db.shift.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'professional-id',
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      })
    })
  })

  describe('cancelShift', () => {
    it('cancels shift successfully when no bookings', async () => {
      const mockShift = {
        id: 'shift-id',
        professionalId: 'professional-id',
        resourceId: 'resource-id',
        startTime: new Date('2026-02-22T10:00:00Z'),
        endTime: new Date('2026-02-22T10:30:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        bookings: [],
      }
      vi.mocked(db.shift.findUnique).mockResolvedValue(mockShift)
      vi.mocked(db.shift.update).mockResolvedValue({
        ...mockShift,
        deletedAt: new Date(),
      })

      const result = await cancelShift('shift-id')

      expect(result.deletedAt).toBeTruthy()
      expect(db.shift.findUnique).toHaveBeenCalledWith({
        where: { id: 'shift-id', deletedAt: null },
        include: {
          bookings: {
            where: { deletedAt: null, status: 'CONFIRMED' },
            select: { id: true },
          },
        },
      })
      expect(db.shift.update).toHaveBeenCalledWith({
        where: { id: 'shift-id' },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('throws NotFoundError for non-existent shift', async () => {
      vi.mocked(db.shift.findUnique).mockResolvedValue(null)

      await expect(cancelShift('nonexistent-id'))
        .rejects.toThrow('Shift not found')
    })

    it('throws BusinessRuleError when shift belongs to different professional', async () => {
      const mockShift = {
        id: 'shift-id',
        professionalId: 'other-professional-id',
        resourceId: 'resource-id',
        startTime: new Date('2026-02-22T10:00:00Z'),
        endTime: new Date('2026-02-22T10:30:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        bookings: [],
      }
      vi.mocked(db.shift.findUnique).mockResolvedValue(mockShift)

      await expect(cancelShift('shift-id'))
        .rejects.toThrow('Only the shift owner can cancel it')
    })

    it('throws BusinessRuleError when shift has confirmed bookings', async () => {
      const mockShift = {
        id: 'shift-id',
        professionalId: 'professional-id',
        resourceId: 'resource-id',
        startTime: new Date('2026-02-22T10:00:00Z'),
        endTime: new Date('2026-02-22T10:30:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        bookings: [{ id: 'booking-1' }],
      }
      vi.mocked(db.shift.findUnique).mockResolvedValue(mockShift)

      await expect(cancelShift('shift-id'))
        .rejects.toThrow('Cannot cancel shift with confirmed bookings')
    })
  })

  describe('getActiveResources', () => {
    it('returns active resources', async () => {
      const mockResources = [
        { id: 'resource-1', name: 'Resource 1', description: null, location: null, quantity: 1, professionalsPerUnit: 1, isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'resource-2', name: 'Resource 2', description: null, location: null, quantity: 1, professionalsPerUnit: 1, isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ]
      vi.mocked(db.resource.findMany).mockResolvedValue(mockResources)

      const result = await getActiveResources()

      expect(result).toEqual(mockResources)
      expect(db.resource.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      })
    })
  })
})