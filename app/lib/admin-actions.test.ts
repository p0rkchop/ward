import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, BookingStatus } from '@/app/generated/prisma/enums'
import {
  getAdminStats,
  getResources,
  createResource,
  updateResource,
  deleteResource,
  getUsers,
  updateUserRole,
  deleteUser,
  exportData,
  clearTestData,
  AdminStats,
} from './admin-actions'

// Mock the database
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

import { db } from './db'
import { getServerSession } from './auth'

describe('admin-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated admin session
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'admin-id',
        role: Role.ADMIN,
        name: 'Test Admin',
        phoneNumber: '+1234567890',
        setupComplete: true,
        isNewUser: false,
      },
      expires: new Date().toISOString(),
    })
  })

  describe('getAdminStats', () => {
    it('returns admin statistics', async () => {
      // Mock user counts by role
      vi.mocked(db.user.groupBy).mockResolvedValue([
        { role: Role.ADMIN, _count: 2 },
        { role: Role.PROFESSIONAL, _count: 5 },
        { role: Role.CLIENT, _count: 20 },
      ] as any)

      // Mock resource counts
      vi.mocked(db.resource.count)
        .mockResolvedValueOnce(8 as any) // active resources
        .mockResolvedValueOnce(10 as any) // total resources

      // Mock shift counts
      vi.mocked(db.shift.count)
        .mockResolvedValueOnce(15 as any) // upcoming shifts
        .mockResolvedValueOnce(30 as any) // total shifts

      // Mock booking counts by status
      vi.mocked(db.booking.groupBy).mockResolvedValue([
        { status: BookingStatus.CONFIRMED, _count: 25 },
        { status: BookingStatus.CANCELLED, _count: 5 },
      ] as any)

      // Mock recent activity
      const mockRecentBookings = [
        {
          id: 'booking-1',
          createdAt: new Date('2026-02-22T10:00:00Z'),
          client: { name: 'Client One' },
          shift: {
            resource: { name: 'Resource A' },
          },
        },
      ]
      const mockRecentShifts = [
        {
          id: 'shift-1',
          createdAt: new Date('2026-02-22T09:00:00Z'),
          professional: { name: 'Professional One' },
          resource: { name: 'Resource B' },
        },
      ]
      const mockRecentUsers = [
        {
          id: 'user-1',
          createdAt: new Date('2026-02-22T08:00:00Z'),
          name: 'New User',
          role: Role.CLIENT,
        },
      ]

      vi.mocked(db.booking.findMany).mockResolvedValue(mockRecentBookings as any)
      vi.mocked(db.shift.findMany).mockResolvedValue(mockRecentShifts as any)
      vi.mocked(db.user.findMany).mockResolvedValue(mockRecentUsers as any)

      const result = await getAdminStats()

      // Verify structure
      expect(result).toEqual({
        userCounts: {
          admins: 2,
          professionals: 5,
          clients: 20,
          total: 27,
        },
        resourceCounts: {
          active: 8,
          total: 10,
        },
        shiftCounts: {
          upcoming: 15,
          total: 30,
        },
        bookingCounts: {
          confirmed: 25,
          cancelled: 5,
          total: 30,
        },
        recentActivity: expect.any(Array),
      })

      // Verify recent activity sorting
      expect(result.recentActivity).toHaveLength(3)
      // Should be sorted by timestamp descending
      expect(result.recentActivity[0].type).toBe('BOOKING')
      expect(result.recentActivity[1].type).toBe('SHIFT')
      expect(result.recentActivity[2].type).toBe('USER')
    })

    it('handles empty data', async () => {
      vi.mocked(db.user.groupBy).mockResolvedValue([] as any)
      vi.mocked(db.resource.count).mockResolvedValue(0 as any)
      vi.mocked(db.shift.count).mockResolvedValue(0 as any)
      vi.mocked(db.booking.groupBy).mockResolvedValue([] as any)
      vi.mocked(db.booking.findMany).mockResolvedValue([])
      vi.mocked(db.shift.findMany).mockResolvedValue([])
      vi.mocked(db.user.findMany).mockResolvedValue([])

      const result = await getAdminStats()

      expect(result).toEqual({
        userCounts: {
          admins: 0,
          professionals: 0,
          clients: 0,
          total: 0,
        },
        resourceCounts: {
          active: 0,
          total: 0,
        },
        shiftCounts: {
          upcoming: 0,
          total: 0,
        },
        bookingCounts: {
          confirmed: 0,
          cancelled: 0,
          total: 0,
        },
        recentActivity: [],
      })
    })
  })

  describe('resource management', () => {
    describe('getResources', () => {
      it('returns all non-deleted resources sorted by name', async () => {
        const mockResources = [
          { id: 'resource-1', name: 'Alpha', description: 'First resource', isActive: true, deletedAt: null },
          { id: 'resource-2', name: 'Beta', description: 'Second resource', isActive: false, deletedAt: null },
        ]
        vi.mocked(db.resource.findMany).mockResolvedValue(mockResources as any)

        const result = await getResources()

        expect(result).toEqual(mockResources)
        expect(db.resource.findMany).toHaveBeenCalledWith({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        })
      })
    })

    describe('createResource', () => {
      it('creates a resource with provided data', async () => {
        const resourceData = {
          name: 'New Resource',
          description: 'A new resource',
          quantity: 1,
          professionalsPerUnit: 1,
          isActive: true,
        }
        const mockCreatedResource = {
          id: 'new-id',
          ...resourceData,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }
        vi.mocked(db.resource.create).mockResolvedValue(mockCreatedResource as any)

        const result = await createResource(resourceData)

        expect(result).toEqual(mockCreatedResource)
        expect(db.resource.create).toHaveBeenCalledWith({
          data: {
            name: resourceData.name,
            description: resourceData.description,
            location: undefined,
            quantity: resourceData.quantity,
            professionalsPerUnit: resourceData.professionalsPerUnit,
            isActive: resourceData.isActive,
          },
        })
      })
    })

    describe('updateResource', () => {
      it('updates a non-deleted resource', async () => {
        const resourceId = 'resource-id'
        const updateData = {
          name: 'Updated Name',
          isActive: false,
        }
        const mockUpdatedResource = {
          id: resourceId,
          ...updateData,
          description: 'Test Description',
          location: null,
          quantity: 1,
          professionalsPerUnit: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        }
        vi.mocked(db.resource.update).mockResolvedValue(mockUpdatedResource)

        const result = await updateResource(resourceId, updateData)

        expect(result).toEqual(mockUpdatedResource)
        expect(db.resource.update).toHaveBeenCalledWith({
          where: { id: resourceId, deletedAt: null },
          data: updateData,
        })
      })
    })

    describe('deleteResource', () => {
      it('soft deletes a resource', async () => {
        const resourceId = 'resource-id'
        const mockDeletedResource = {
          id: resourceId,
          name: 'Resource Name',
          description: 'Resource description',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: new Date('2026-02-22T10:00:00Z'),
        }
        vi.mocked(db.resource.update).mockResolvedValue(mockDeletedResource as any)

        const result = await deleteResource(resourceId)

        expect(result.deletedAt).toBeTruthy()
        expect(db.resource.update).toHaveBeenCalledWith({
          where: { id: resourceId, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        })
      })
    })
  })

  describe('user management', () => {
    describe('getUsers', () => {
      it('returns all non-deleted users with relations', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            name: 'User One',
            phoneNumber: '+12345678901',
            email: 'user1@example.com',
            role: Role.PROFESSIONAL,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            shiftsAsProfessional: [{ id: 'shift-1' }],
            bookingsAsClient: [],
          },
          {
            id: 'user-2',
            name: 'User Two',
            phoneNumber: '+12345678902',
            email: 'user2@example.com',
            role: Role.CLIENT,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            shiftsAsProfessional: [],
            bookingsAsClient: [{ id: 'booking-1' }],
          },
        ]
        vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as any)

        const result = await getUsers()

        expect(result).toEqual(mockUsers)
        expect(db.user.findMany).toHaveBeenCalledWith({
          where: { deletedAt: null },
          include: {
            shiftsAsProfessional: {
              where: { deletedAt: null },
              select: { id: true },
            },
            bookingsAsClient: {
              where: { deletedAt: null },
              select: { id: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      })
    })

    describe('updateUserRole', () => {
      it('updates role for non-deleted user', async () => {
        const userId = 'user-id'
        const newRole = Role.PROFESSIONAL
        const mockUpdatedUser = {
          id: userId,
          name: 'User Name',
          phoneNumber: '+1234567890',
          email: 'user@example.com',
          role: newRole,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }
        vi.mocked(db.user.update).mockResolvedValue(mockUpdatedUser as any)

        const result = await updateUserRole(userId, newRole)

        expect(result).toEqual(mockUpdatedUser)
        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: userId, deletedAt: null },
          data: { role: newRole },
        })
      })
    })

    describe('deleteUser', () => {
      it('soft deletes a user', async () => {
        const userId = 'user-id'
        const mockDeletedUser = {
          id: userId,
          name: 'User Name',
          phoneNumber: '+1234567890',
          email: 'user@example.com',
          role: Role.CLIENT,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: new Date('2026-02-22T10:00:00Z'),
        }
        vi.mocked(db.user.update).mockResolvedValue(mockDeletedUser as any)

        const result = await deleteUser(userId)

        expect(result.deletedAt).toBeTruthy()
        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: userId, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        })
      })
    })
  })

  describe('admin tools', () => {
    describe('exportData', () => {
      it('exports all non-deleted data', async () => {
        const mockUsers = [
          { id: 'user-1', name: 'User One', phoneNumber: '+1234567890', email: 'user1@example.com', role: Role.PROFESSIONAL, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        ]
        const mockResources = [
          { id: 'resource-1', name: 'Resource One', description: 'Test', isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        ]
        const mockShifts = [
          { id: 'shift-1', startTime: new Date(), endTime: new Date(), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, professionalId: 'prof-1', resourceId: 'res-1', professional: { name: 'Pro One' }, resource: { name: 'Resource One' } },
        ]
        const mockBookings = [
          { id: 'booking-1', startTime: new Date(), endTime: new Date(), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, status: BookingStatus.CONFIRMED, notes: null, clientId: 'client-1', shiftId: 'shift-1', client: { name: 'Client One' }, shift: { resource: { name: 'Resource One' } } },
        ]

        vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as any)
        vi.mocked(db.resource.findMany).mockResolvedValue(mockResources as any)
        vi.mocked(db.shift.findMany).mockResolvedValue(mockShifts as any)
        vi.mocked(db.booking.findMany).mockResolvedValue(mockBookings as any)

        const result = await exportData()

        expect(result).toEqual({
          exportedAt: expect.any(String),
          users: mockUsers,
          resources: mockResources,
          shifts: mockShifts,
          bookings: mockBookings,
        })

        // Verify user query excludes deleted users and selects specific fields
        expect(db.user.findMany).toHaveBeenCalledWith({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      })
    })

    describe('clearTestData', () => {
      it('updates deletedAt for records soft-deleted more than 30 days ago', async () => {
        const mockUpdateResult = { count: 5 }
        vi.mocked(db.user.updateMany).mockResolvedValue(mockUpdateResult)
        vi.mocked(db.resource.updateMany).mockResolvedValue(mockUpdateResult)
        vi.mocked(db.shift.updateMany).mockResolvedValue(mockUpdateResult)
        vi.mocked(db.booking.updateMany).mockResolvedValue(mockUpdateResult)

        const result = await clearTestData()

        expect(result).toEqual({
          clearedAt: expect.any(String),
          users: 5,
          resources: 5,
          shifts: 5,
          bookings: 5,
        })

        // Verify the date calculation (30 days ago)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Check that updateMany was called with approximately correct arguments
        expect(db.user.updateMany).toHaveBeenCalled()
        const call = vi.mocked(db.user.updateMany).mock.calls[0][0]

        // Verify where clause structure
        expect(call.where).toEqual({
          deletedAt: { not: null, lt: expect.any(Date) },
        })

        // Verify lt date is approximately 30 days ago (within 1 second)
        const ltDate = (call.where as any).deletedAt.lt as Date
        expect(Math.abs(ltDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(1000)

        // Verify data
        expect(call.data).toEqual({ deletedAt: expect.any(Date) })
      })
    })
  })
})