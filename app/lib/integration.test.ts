import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createShift } from './shift-actions'
import { getAvailableTimeslots, bookTimeslot, cancelBooking } from './booking-actions'
import { getAdminStats } from './admin-actions'

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

vi.mock('./timeslot-utils', () => ({
  generateTimeSlots: vi.fn(),
  isValid30MinuteInterval: vi.fn(),
  isAlignedTo30MinuteBoundary: vi.fn(),
  timeRangesOverlap: vi.fn(),
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
  createBookingSchema: { safeParse: vi.fn() },
  validateSchema: vi.fn(),
  validateProfessionalRole: vi.fn(),
  validateClientRole: vi.fn(),
  validateResourceActive: vi.fn(),
  validate30MinuteInterval: vi.fn(),
  findOverlappingShifts: vi.fn(),
}))

import { db } from './db'
import { getServerSession } from './auth'
import { generateTimeSlots, isValid30MinuteInterval, isAlignedTo30MinuteBoundary } from './timeslot-utils'
import {
  validateSchema,
  validateProfessionalRole,
  validateClientRole,
  validateResourceActive,
  validate30MinuteInterval,
  findOverlappingShifts,
} from './validation'
import { Role, BookingStatus } from '@/app/generated/prisma/enums'

describe('Integration Tests - Complete User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Professional Shift Creation Flow', () => {
    const mockProfessionalId = 'professional-id'
    const mockResourceId = 'resource-id'
    const mockStart = new Date('2026-02-22T10:00:00Z')
    const mockEnd = new Date('2026-02-22T10:30:00Z')

    beforeEach(() => {
      // Mock session for professional
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: mockProfessionalId,
          role: Role.PROFESSIONAL,
          name: 'Test Professional',
          phoneNumber: '+1234567890',
          setupComplete: true,
          isNewUser: false,
        },
        expires: new Date().toISOString(),
      })

      // Mock validation functions
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
    })

    it('creates shift successfully', async () => {
      const mockShift = {
        id: 'shift-id',
        startTime: mockStart,
        endTime: mockEnd,
        professionalId: mockProfessionalId,
        resourceId: mockResourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        professional: { id: mockProfessionalId, name: 'Test Professional', phoneNumber: '+1234567890' },
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
      expect(validateProfessionalRole).toHaveBeenCalledWith(mockProfessionalId)
      expect(validateResourceActive).toHaveBeenCalledWith(mockResourceId)
    })

    it('rejects shift creation for non-professional', async () => {
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
  })

  describe('Client Booking Flow', () => {
    const mockClientId = 'client-id'
    const mockProfessionalId = 'professional-id'
    const mockResourceId = 'resource-id'
    const mockStart = new Date('2026-02-22T10:00:00Z')
    const mockEnd = new Date('2026-02-22T10:30:00Z')
    const mockShiftId = 'shift-id'

    beforeEach(() => {
      // Mock validation for booking
      vi.mocked(validateSchema).mockReturnValue({
        clientId: mockClientId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(validate30MinuteInterval).mockReturnValue()
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateClientRole).mockResolvedValue(undefined)
    })

    it('completes booking flow: shift creation -> timeslot availability -> booking', async () => {
      // 1. Mock shift exists (created by professional earlier)
      const mockShift = {
        id: mockShiftId,
        startTime: new Date('2026-02-22T09:30:00Z'),
        endTime: new Date('2026-02-22T11:00:00Z'),
        professionalId: mockProfessionalId,
        resourceId: mockResourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        resource: { id: mockResourceId, name: 'Test Resource', isActive: true },
        professional: { id: mockProfessionalId, name: 'Test Professional', phoneNumber: '+1234567890' },
        bookings: [], // No existing bookings
      }

      // 2. Mock getAvailableTimeslots returns the shift
      const mockSlots = [
        { start: mockStart, end: mockEnd }
      ]
      vi.mocked(generateTimeSlots).mockReturnValue(mockSlots)
      // Mock shifts that cover the slot
      vi.mocked(db.shift.findMany).mockResolvedValue([
        { id: mockShiftId, startTime: new Date('2026-02-22T09:30:00Z'), endTime: new Date('2026-02-22T11:00:00Z') },
      ] as any)
      // Mock bookings (none yet)
      vi.mocked(db.booking.findMany).mockResolvedValue([] as any)

      const availableResult = await getAvailableTimeslots(mockStart, mockEnd)

      expect(availableResult.allSlots).toHaveLength(1)
      expect(availableResult.availableSlots).toHaveLength(1)
      expect(availableResult.allSlots[0].shiftCount).toBe(1)
      expect(availableResult.allSlots[0].bookingCount).toBe(0)
      expect(availableResult.allSlots[0].availableCapacity).toBe(1)
      expect(availableResult.allSlots[0].isAvailable).toBe(true)

      // 3. Mock bookTimeslot to use the available shift
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return await callback({
          shift: {
            findMany: vi.fn().mockResolvedValue([mockShift]),
          },
          booking: {
            count: vi.fn().mockResolvedValue(0), // No concurrent booking
            create: vi.fn().mockResolvedValue({
              id: 'booking-id',
              startTime: mockStart,
              endTime: mockEnd,
              clientId: mockClientId,
              shiftId: mockShiftId,
              status: BookingStatus.CONFIRMED,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              client: { id: mockClientId, name: 'Test Client', phoneNumber: '+1234567890' },
              shift: mockShift,
            }),
          },
        } as any)
      })

      const bookingResult = await bookTimeslot(mockClientId, mockStart, mockEnd)

      expect(bookingResult).toBeDefined()
      expect(bookingResult.shiftId).toBe(mockShiftId)
      expect(bookingResult.clientId).toBe(mockClientId)
    })

    it('handles booking cancellation flow', async () => {
      const mockBookingId = 'booking-id'
      const mockBooking = {
        id: mockBookingId,
        clientId: mockClientId,
        shiftId: mockShiftId,
        startTime: new Date('2026-02-24T10:00:00Z'), // Future date
        endTime: new Date('2026-02-24T10:30:00Z'),
        status: BookingStatus.CONFIRMED,
        notes: null,
        createdAt: new Date('2026-02-24T09:00:00Z'),
        updatedAt: new Date('2026-02-24T09:00:00Z'),
        deletedAt: null,
        shift: {
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
        },
      }

      vi.mocked(db.booking.findUnique).mockResolvedValue(mockBooking as any)
      vi.mocked(db.booking.update).mockResolvedValue({
        ...mockBooking,
        deletedAt: new Date('2026-02-22T11:00:00Z'),
        shift: {
          professional: { id: mockProfessionalId, name: 'Test Professional', phoneNumber: '+1234567890' },
          resource: { id: mockResourceId, name: 'Test Resource', description: 'Test Description' },
        },
      } as any)

      const result = await cancelBooking(mockBookingId, mockClientId)

      expect(result.deletedAt).toBeTruthy()
      expect(db.booking.findUnique).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        include: {
          shift: {
            select: { startTime: true, endTime: true },
          },
        },
      })
    })
  })

  describe('Admin Management Flow', () => {
    it('provides admin statistics', async () => {
      // Mock user counts
      vi.mocked(db.user.groupBy).mockResolvedValue([
        { role: Role.ADMIN, _count: 2 },
        { role: Role.PROFESSIONAL, _count: 5 },
        { role: Role.CLIENT, _count: 20 },
      ] as any)

      // Mock resource counts
      vi.mocked(db.resource.count)
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(10) // total

      // Mock shift counts
      vi.mocked(db.shift.count)
        .mockResolvedValueOnce(15) // upcoming
        .mockResolvedValueOnce(30) // total

      // Mock booking counts
      vi.mocked(db.booking.groupBy).mockResolvedValue([
        { status: BookingStatus.CONFIRMED, _count: 25 },
        { status: BookingStatus.CANCELLED, _count: 5 },
      ] as any)

      // Mock recent activity
      vi.mocked(db.booking.findMany).mockResolvedValue([] as any)
      vi.mocked(db.shift.findMany).mockResolvedValue([])
      vi.mocked(db.user.findMany).mockResolvedValue([])

      const stats = await getAdminStats()

      expect(stats.userCounts.admins).toBe(2)
      expect(stats.userCounts.professionals).toBe(5)
      expect(stats.userCounts.clients).toBe(20)
      expect(stats.resourceCounts.active).toBe(8)
      expect(stats.shiftCounts.upcoming).toBe(15)
      expect(stats.bookingCounts.confirmed).toBe(25)
    })
  })
})