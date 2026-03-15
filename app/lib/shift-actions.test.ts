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
      eventDay: createMockDelegate(),
      event: createMockDelegate(),
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
        theme: 'system',
        timeFormat: '12h',
        dateFormat: 'MM/DD/YYYY',
        timezone: 'America/Chicago',
        notifyViaEmail: true,
        notifyViaPush: false,
      },
      expires: new Date().toISOString(),
    })
  })

  describe('createShift', () => {
    const mockResourceId = 'resource-id'
    const mockStart = new Date('2099-06-15T10:00:00Z')
    const mockEnd = new Date('2099-06-15T10:30:00Z')

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
        resourceOverlapCount: 0,
      })

      // Mock db.resource.findUnique for capacity check
      vi.mocked(db.resource.findUnique).mockResolvedValue({
        id: 'resource-id', name: 'Test', description: null, location: null,
        quantity: 1, professionalsPerUnit: 1, isActive: true,
        deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
      } as any)

      // Mock db.user.findUnique for event day validation (assigned to event)
      vi.mocked(db.user.findUnique).mockResolvedValue({ eventId: 'event-id' } as any)
      vi.mocked(db.event.findUnique).mockResolvedValue({ timezone: 'UTC' } as any)

      // Mock db.eventDay.findFirst for event day validation
      vi.mocked(db.eventDay.findFirst).mockResolvedValue({
        id: 'event-day-id',
        eventId: 'event-id',
        date: new Date('2099-06-15T12:00:00Z'),
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        blackouts: [],
      } as any)

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
            findUnique: vi.fn().mockResolvedValue({ isActive: true, quantity: 1, professionalsPerUnit: 1 }),
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
          theme: 'system',
          timeFormat: '12h',
          dateFormat: 'MM/DD/YYYY',
          timezone: 'America/Chicago',
          notifyViaEmail: true,
          notifyViaPush: false,
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
        resourceOverlapCount: 0,
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
        resourceOverlapCount: 1,
      })
      vi.mocked(isValid30MinuteInterval).mockReturnValue(true)
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateProfessionalRole).mockResolvedValue(undefined)
      vi.mocked(validateResourceActive).mockResolvedValue(undefined)

      // Mock db.resource.findUnique for capacity check (capacity = 1, overlap = 1 → at capacity)
      vi.mocked(db.resource.findUnique).mockResolvedValue({
        id: 'resource-id', name: 'Test', description: null, location: null,
        quantity: 1, professionalsPerUnit: 1, isActive: true,
        deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
      } as any)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('Resource is at capacity')
    })

    // Helper to set up mocks through the capacity check (for event day validation tests)
    function setupMocksThroughCapacity() {
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
        resourceOverlapCount: 0,
      })
      vi.mocked(db.resource.findUnique).mockResolvedValue({
        id: 'resource-id', name: 'Test', description: null, location: null,
        quantity: 1, professionalsPerUnit: 1, isActive: true,
        deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
      } as any)
    }

    it('throws BusinessRuleError when no event day exists for shift date', async () => {
      setupMocksThroughCapacity()
      vi.mocked(db.user.findUnique).mockResolvedValue({ eventId: 'event-1' } as any)
      vi.mocked(db.event.findUnique).mockResolvedValue({ timezone: 'UTC' } as any)
      vi.mocked(db.eventDay.findFirst).mockResolvedValue(null)

      await expect(createShift(mockResourceId, mockStart, mockEnd))
        .rejects.toThrow('No active event day exists for this date')
    })

    it('throws BusinessRuleError when shift is outside event day hours', async () => {
      // Use UTC dates to match server-side UTC-based validation
      const earlyStart = new Date('2099-06-15T08:00:00.000Z');
      const earlyEnd = new Date('2099-06-15T08:30:00.000Z');
      const shiftDate = new Date('2099-06-15T00:00:00.000Z');

      setupMocksThroughCapacity()
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: earlyStart,
        end: earlyEnd,
      })
      vi.mocked(db.user.findUnique).mockResolvedValue({ eventId: 'event-1' } as any)
      vi.mocked(db.event.findUnique).mockResolvedValue({ timezone: 'UTC' } as any)
      // Event day has hours 14:00-17:00 but shift is at 08:00-08:30
      vi.mocked(db.eventDay.findFirst).mockResolvedValue({
        id: 'day-1',
        date: shiftDate,
        startTime: '14:00',
        endTime: '17:00',
        blackouts: [],
      } as any)

      await expect(createShift(mockResourceId, earlyStart, earlyEnd))
        .rejects.toThrow('Shift must be within event day hours (14:00 - 17:00)')
    })

    it('throws BusinessRuleError when shift overlaps with blackout period', async () => {
      // Use local-time dates to match how setHours works in the validation code
      // Use UTC dates to match server-side UTC-based validation
      const localStart = new Date('2099-06-15T10:00:00.000Z');
      const localEnd = new Date('2099-06-15T10:30:00.000Z');
      const shiftDate = new Date('2099-06-15T00:00:00.000Z');

      setupMocksThroughCapacity()
      vi.mocked(validateSchema).mockReturnValue({
        resourceId: mockResourceId,
        start: localStart,
        end: localEnd,
      })
      vi.mocked(db.user.findUnique).mockResolvedValue({ eventId: 'event-1' } as any)
      vi.mocked(db.event.findUnique).mockResolvedValue({ timezone: 'UTC' } as any)
      // Event day covers 09:00-17:00, blackout from 10:00-11:00
      vi.mocked(db.eventDay.findFirst).mockResolvedValue({
        id: 'day-1',
        date: shiftDate,
        startTime: '09:00',
        endTime: '17:00',
        blackouts: [
          { startTime: '10:00', endTime: '11:00', description: 'Lunch' },
        ],
      } as any)

      await expect(createShift(mockResourceId, localStart, localEnd))
        .rejects.toThrow('Shift overlaps with a blackout period (10:00 - 11:00: Lunch)')
    })
  })

  describe('getProfessionalShifts', () => {
    it('returns shifts for professional with date filters', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          startTime: new Date('2099-06-15T10:00:00Z'),
          endTime: new Date('2099-06-15T10:30:00Z'),
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

      const start = new Date('2099-06-15T00:00:00Z')
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
        startTime: new Date('2099-06-15T10:00:00Z'),
        endTime: new Date('2099-06-15T10:30:00Z'),
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
        startTime: new Date('2099-06-15T10:00:00Z'),
        endTime: new Date('2099-06-15T10:30:00Z'),
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
        startTime: new Date('2099-06-15T10:00:00Z'),
        endTime: new Date('2099-06-15T10:30:00Z'),
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
        { id: 'resource-1', name: 'Resource 1', description: null, location: null, quantity: 1, professionalsPerUnit: 1, staffOnly: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'resource-2', name: 'Resource 2', description: null, location: null, quantity: 1, professionalsPerUnit: 1, staffOnly: false, isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
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