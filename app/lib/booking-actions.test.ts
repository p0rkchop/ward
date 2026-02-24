import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAvailableTimeslots, bookTimeslot, getProfessionalBookings, getClientBookings, cancelBooking } from './booking-actions'
import { BookingStatus } from '@/app/generated/prisma/enums'

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

vi.mock('./timeslot-utils', () => ({
  generateTimeSlots: vi.fn(),
  isAlignedTo30MinuteBoundary: vi.fn(),
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
  createBookingSchema: { safeParse: vi.fn() },
  validateSchema: vi.fn(),
  validateClientRole: vi.fn(),
  validate30MinuteInterval: vi.fn(),
}))

import { db } from './db'
import { generateTimeSlots, isAlignedTo30MinuteBoundary } from './timeslot-utils'
import { validateSchema, validateClientRole, validate30MinuteInterval } from './validation'

describe('booking-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAvailableTimeslots', () => {
    it('returns available time slots with capacity', async () => {
      const mockStart = new Date('2026-02-24T10:00:00Z')
      const mockEnd = new Date('2026-02-24T11:00:00Z')
      const mockSlots = [
        { start: new Date('2026-02-24T10:00:00Z'), end: new Date('2026-02-24T10:30:00Z') },
        { start: new Date('2026-02-24T10:30:00Z'), end: new Date('2026-02-24T11:00:00Z') },
      ]

      vi.mocked(generateTimeSlots).mockReturnValue(mockSlots)
      // Mock shifts that cover both slots (2 shifts, each covering both 30-minute slots)
      const mockShifts = [
        { id: 'shift-1', startTime: new Date('2026-02-24T09:30:00Z'), endTime: new Date('2026-02-24T11:30:00Z') },
        { id: 'shift-2', startTime: new Date('2026-02-24T09:45:00Z'), endTime: new Date('2026-02-24T11:15:00Z') },
      ]
      // Mock bookings for each slot (one booking per slot)
      const mockBookings = [
        { startTime: new Date('2026-02-24T10:00:00Z'), endTime: new Date('2026-02-24T10:30:00Z') },
        { startTime: new Date('2026-02-24T10:30:00Z'), endTime: new Date('2026-02-24T11:00:00Z') },
      ]
      vi.mocked(db.shift.findMany).mockResolvedValue(mockShifts as any)
      vi.mocked(db.booking.findMany).mockResolvedValue(mockBookings as any)

      const result = await getAvailableTimeslots(mockStart, mockEnd)

      expect(result).toEqual({
        allSlots: [
          {
            start: mockSlots[0].start,
            end: mockSlots[0].end,
            shiftCount: 2,
            bookingCount: 1,
            availableCapacity: 1,
            isAvailable: true,
          },
          {
            start: mockSlots[1].start,
            end: mockSlots[1].end,
            shiftCount: 2,
            bookingCount: 1,
            availableCapacity: 1,
            isAvailable: true,
          },
        ],
        availableSlots: [
          {
            start: mockSlots[0].start,
            end: mockSlots[0].end,
            shiftCount: 2,
            bookingCount: 1,
            availableCapacity: 1,
            isAvailable: true,
          },
          {
            start: mockSlots[1].start,
            end: mockSlots[1].end,
            shiftCount: 2,
            bookingCount: 1,
            availableCapacity: 1,
            isAvailable: true,
          },
        ],
      })

      expect(generateTimeSlots).toHaveBeenCalledWith(mockStart, mockEnd)
      expect(db.shift.findMany).toHaveBeenCalledTimes(1)
      expect(db.booking.findMany).toHaveBeenCalledTimes(1)
    })

    it('throws error when start >= end', async () => {
      const start = new Date('2026-02-24T11:00:00Z')
      const end = new Date('2026-02-24T10:00:00Z')

      await expect(getAvailableTimeslots(start, end))
        .rejects.toThrow('Start date must be before end date')
    })

    it('filters out slots with zero capacity', async () => {
      const mockSlots = [
        { start: new Date('2026-02-24T10:00:00Z'), end: new Date('2026-02-24T10:30:00Z') },
        { start: new Date('2026-02-24T10:30:00Z'), end: new Date('2026-02-24T11:00:00Z') },
      ]

      vi.mocked(generateTimeSlots).mockReturnValue(mockSlots)
      // Mock shifts: one shift covers first slot only, none for second slot
      const mockShifts = [
        { id: 'shift-1', startTime: new Date('2026-02-24T09:30:00Z'), endTime: new Date('2026-02-24T10:29:00Z') },
      ]
      // Mock bookings: one booking for first slot only
      const mockBookings = [
        { startTime: new Date('2026-02-24T10:00:00Z'), endTime: new Date('2026-02-24T10:30:00Z') },
      ]
      vi.mocked(db.shift.findMany).mockResolvedValue(mockShifts as any)
      vi.mocked(db.booking.findMany).mockResolvedValue(mockBookings as any)

      const result = await getAvailableTimeslots(
        new Date('2026-02-24T10:00:00Z'),
        new Date('2026-02-24T11:00:00Z')
      )

      // First slot: shiftCount=1, bookingCount=1 => availableCapacity=0 => isAvailable=false
      // Second slot: shiftCount=0, bookingCount=0 => availableCapacity=0 => isAvailable=false
      // Both slots have zero capacity, so filtered out from availableSlots
      expect(result.availableSlots).toHaveLength(0)
      expect(result.allSlots).toHaveLength(2)
      expect(result.allSlots[0].availableCapacity).toBe(0)
      expect(result.allSlots[0].isAvailable).toBe(false)
      expect(result.allSlots[1].availableCapacity).toBe(0)
      expect(result.allSlots[1].isAvailable).toBe(false)
    })
  })

  describe('bookTimeslot', () => {
    const mockClientId = 'client-id'
    const mockStart = new Date('2026-02-24T10:00:00Z')
    const mockEnd = new Date('2026-02-24T10:30:00Z')

    beforeEach(() => {
      vi.mocked(validateSchema).mockReturnValue({
        clientId: mockClientId,
        start: mockStart,
        end: mockEnd,
      })
      vi.mocked(validate30MinuteInterval).mockReturnValue()
      vi.mocked(isAlignedTo30MinuteBoundary).mockReturnValue(true)
      vi.mocked(validateClientRole).mockResolvedValue(undefined)
    })

    it('creates booking successfully with auto-matching', async () => {
      const mockShift = {
        id: 'shift-id',
        startTime: new Date('2026-02-24T09:30:00Z'),
        endTime: new Date('2026-02-24T11:00:00Z'),
        professionalId: 'professional-id',
        resourceId: 'resource-id',
        createdAt: new Date('2026-02-24T09:00:00Z'),
        updatedAt: new Date('2026-02-24T09:00:00Z'),
        deletedAt: null,
        resource: { id: 'resource-id', name: 'Test Resource', isActive: true },
        professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
        bookings: [], // No existing bookings for this timeslot
      }

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return await callback({
          shift: {
            findMany: vi.fn().mockResolvedValue([mockShift]),
          } as any,
          booking: {
            count: vi.fn().mockResolvedValue(0), // No concurrent booking
            create: vi.fn().mockResolvedValue({
              id: 'booking-id',
              startTime: mockStart,
              endTime: mockEnd,
              clientId: mockClientId,
              shiftId: mockShift.id,
              status: BookingStatus.CONFIRMED,
              notes: null,
              createdAt: new Date('2026-02-24T10:00:00Z'),
              updatedAt: new Date('2026-02-24T10:00:00Z'),
              deletedAt: null,
              client: { id: mockClientId, name: 'Test Client', phoneNumber: '+1234567890' },
              shift: {
                include: {
                  professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
                  resource: { id: 'resource-id', name: 'Test Resource', description: 'Test Description' },
                },
              },
            }),
          } as any,
        } as any)
      })

      const result = await bookTimeslot(mockClientId, mockStart, mockEnd)

      expect(result).toBeDefined()
      expect(validateSchema).toHaveBeenCalled()
      expect(validate30MinuteInterval).toHaveBeenCalledWith(mockStart, mockEnd)
      expect(isAlignedTo30MinuteBoundary).toHaveBeenCalledWith(mockStart)
      expect(validateClientRole).toHaveBeenCalledWith(mockClientId)
    })

    it('throws BusinessRuleError when no available professionals', async () => {
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return await callback({
          shift: {
            findMany: vi.fn().mockResolvedValue([]), // No shifts
          } as any,
          booking: {
            count: vi.fn(),
            create: vi.fn(),
          } as any,
        } as any)
      })

      await expect(bookTimeslot(mockClientId, mockStart, mockEnd))
        .rejects.toThrow('No available professionals for the requested timeslot')
    })

    it('throws BusinessRuleError when shifts exist but no capacity', async () => {
      const mockShift = {
        id: 'shift-id',
        startTime: new Date('2026-02-24T09:30:00Z'),
        endTime: new Date('2026-02-24T11:00:00Z'),
        resource: { id: 'resource-id', name: 'Test Resource', isActive: true },
        professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
        bookings: [{ id: 'existing-booking' }], // Already has a booking for this timeslot
      }

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return await callback({
          shift: {
            findMany: vi.fn().mockResolvedValue([mockShift]),
          } as any,
          booking: {
            count: vi.fn(),
            create: vi.fn(),
          } as any,
        } as any)
      })

      await expect(bookTimeslot(mockClientId, mockStart, mockEnd))
        .rejects.toThrow('No available professionals for the requested timeslot')
    })

    it('retries on ConflictError', async () => {
      let callCount = 0
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        callCount++
        if (callCount === 1) {
          // First attempt: conflict
          const mockShift = {
            id: 'shift-id',
            startTime: new Date('2026-02-24T09:30:00Z'),
            endTime: new Date('2026-02-24T11:00:00Z'),
            resource: { id: 'resource-id', name: 'Test Resource', isActive: true },
            professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
            bookings: [],
          }
          return await callback({
            shift: {
              findMany: vi.fn().mockResolvedValue([mockShift]),
            } as any,
            booking: {
              count: vi.fn().mockResolvedValue(1), // Capacity already taken
              create: vi.fn(),
            } as any,
          } as any)
        } else {
          // Second attempt: success
          const mockShift = {
            id: 'shift-id-2',
            startTime: new Date('2026-02-24T09:30:00Z'),
            endTime: new Date('2026-02-24T11:00:00Z'),
            resource: { id: 'resource-id-2', name: 'Test Resource 2', isActive: true },
            professional: { id: 'professional-id-2', name: 'Test Professional 2', phoneNumber: '+1234567891' },
            bookings: [],
          }
          return await callback({
            shift: {
              findMany: vi.fn().mockResolvedValue([mockShift]),
            } as any,
            booking: {
              count: vi.fn().mockResolvedValue(0),
              create: vi.fn().mockResolvedValue({
                id: 'booking-id',
                startTime: mockStart,
                endTime: mockEnd,
                clientId: mockClientId,
                shiftId: mockShift.id,
                status: 'CONFIRMED',
                client: { id: mockClientId, name: 'Test Client', phoneNumber: '+1234567890' },
                shift: {
                  include: {
                    professional: { id: 'professional-id-2', name: 'Test Professional 2', phoneNumber: '+1234567891' },
                    resource: { id: 'resource-id-2', name: 'Test Resource 2', description: 'Test Description' },
                  },
                },
              }),
            } as any,
          } as any)
        }
      })

      const result = await bookTimeslot(mockClientId, mockStart, mockEnd)

      expect(result).toBeDefined()
      expect(callCount).toBe(2)
    })

    it('throws error after max retries', async () => {
      vi.mocked(db.$transaction).mockImplementation(async () => {
        throw new Error('ConflictError') // Not our custom error, will break out
      })

      await expect(bookTimeslot(mockClientId, mockStart, mockEnd))
        .rejects.toThrow('Failed to create booking')
    })
  })

  describe('getProfessionalBookings', () => {
    it('returns bookings for professional with date filters', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
          clientId: 'client-id',
          shiftId: 'shift-id',
          status: 'CONFIRMED',
          deletedAt: null,
          client: { id: 'client-id', name: 'Test Client', phoneNumber: '+1234567890' },
          shift: {
            resource: { id: 'resource-id', name: 'Test Resource', description: 'Test Description' },
          },
        },
      ] as any
      vi.mocked(db.booking.findMany).mockResolvedValue(mockBookings)

      const start = new Date('2026-02-24T00:00:00Z')
      const end = new Date('2026-02-24T00:00:00Z')
      const result = await getProfessionalBookings('professional-id', start, end)

      expect(result).toEqual(mockBookings)
      expect(db.booking.findMany).toHaveBeenCalledWith({
        where: {
          shift: {
            professionalId: 'professional-id',
            deletedAt: null,
          },
          deletedAt: null,
          status: 'CONFIRMED',
          startTime: { gte: start, lte: end },
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      })
    })

    it('returns bookings without date filters', async () => {
      vi.mocked(db.booking.findMany).mockResolvedValue([])

      const result = await getProfessionalBookings('professional-id')

      expect(result).toEqual([])
      expect(db.booking.findMany).toHaveBeenCalledWith({
        where: {
          shift: {
            professionalId: 'professional-id',
            deletedAt: null,
          },
          deletedAt: null,
          status: 'CONFIRMED',
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      })
    })
  })

  describe('getClientBookings', () => {
    it('returns bookings for client with date filters', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
          clientId: 'client-id',
          shiftId: 'shift-id',
          status: 'CONFIRMED',
          deletedAt: null,
          shift: {
            professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
            resource: { id: 'resource-id', name: 'Test Resource', description: 'Test Description' },
          },
        },
      ] as any
      vi.mocked(db.booking.findMany).mockResolvedValue(mockBookings)

      const start = new Date('2026-02-24T00:00:00Z')
      const end = new Date('2026-02-24T00:00:00Z')
      const result = await getClientBookings('client-id', start, end)

      expect(result).toEqual(mockBookings)
      expect(db.booking.findMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-id',
          deletedAt: null,
          status: 'CONFIRMED',
          startTime: { gte: start, lte: end },
        },
        include: expect.any(Object),
        orderBy: { startTime: 'asc' },
      })
    })
  })

  describe('cancelBooking', () => {
    it('cancels booking successfully', async () => {
      const mockBooking = {
        id: 'booking-id',
        clientId: 'client-id',
        startTime: new Date('2026-02-24T10:00:00Z'),
        deletedAt: null,
        shift: {
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
        },
      } as any

      vi.mocked(db.booking.findUnique).mockResolvedValue(mockBooking)
      vi.mocked(db.booking.update).mockResolvedValue({
        ...mockBooking,
        deletedAt: new Date(),
        shift: {
          professional: { id: 'professional-id', name: 'Test Professional', phoneNumber: '+1234567890' },
          resource: { id: 'resource-id', name: 'Test Resource', description: 'Test Description' },
        },
      } as any)

      const result = await cancelBooking('booking-id', 'client-id')

      expect(result.deletedAt).toBeTruthy()
      expect(db.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-id' },
        include: {
          shift: {
            select: { startTime: true, endTime: true },
          },
        },
      })
      expect(db.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-id' },
        data: { deletedAt: expect.any(Date) },
        include: expect.any(Object),
      })
    })

    it('throws NotFoundError for non-existent booking', async () => {
      vi.mocked(db.booking.findUnique).mockResolvedValue(null)

      await expect(cancelBooking('nonexistent-id', 'client-id'))
        .rejects.toThrow('Booking nonexistent-id not found')
    })

    it('throws BusinessRuleError when client does not own booking', async () => {
      const mockBooking = {
        id: 'booking-id',
        clientId: 'other-client-id',
        shiftId: 'shift-id',
        startTime: new Date('2026-02-24T10:00:00Z'),
        endTime: new Date('2026-02-24T10:30:00Z'),
        status: BookingStatus.CONFIRMED,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        shift: {
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
        },
      }
      vi.mocked(db.booking.findUnique).mockResolvedValue(mockBooking)

      await expect(cancelBooking('booking-id', 'client-id'))
        .rejects.toThrow('You can only cancel your own bookings')
    })

    it('throws BusinessRuleError when booking already cancelled', async () => {
      const mockBooking = {
        id: 'booking-id',
        clientId: 'client-id',
        shiftId: 'shift-id',
        startTime: new Date('2026-02-24T10:00:00Z'),
        endTime: new Date('2026-02-24T10:30:00Z'),
        status: BookingStatus.CONFIRMED,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        shift: {
          startTime: new Date('2026-02-24T10:00:00Z'),
          endTime: new Date('2026-02-24T10:30:00Z'),
        },
      }
      vi.mocked(db.booking.findUnique).mockResolvedValue(mockBooking)

      await expect(cancelBooking('booking-id', 'client-id'))
        .rejects.toThrow('Booking is already cancelled')
    })

    it('throws BusinessRuleError when booking is in the past', async () => {
      const mockBooking = {
        id: 'booking-id',
        clientId: 'client-id',
        shiftId: 'shift-id',
        startTime: new Date('2026-01-01T10:00:00Z'), // Past date
        endTime: new Date('2026-01-01T10:30:00Z'),
        status: BookingStatus.CONFIRMED,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        shift: {
          startTime: new Date('2026-01-01T10:00:00Z'),
          endTime: new Date('2026-01-01T10:30:00Z'),
        },
      }
      vi.mocked(db.booking.findUnique).mockResolvedValue(mockBooking)

      await expect(cancelBooking('booking-id', 'client-id'))
        .rejects.toThrow('Cannot cancel past bookings')
    })
  })
})