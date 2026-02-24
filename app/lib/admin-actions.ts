'use server';

import { db } from './db';
import { Role, BookingStatus } from '@/app/generated/prisma/enums';

export async function getAdminStats() {
  // Get user counts by role
  const userCounts = await db.user.groupBy({
    by: ['role'],
    where: {
      deletedAt: null,
    },
    _count: true,
  });

  const roleCounts = {
    admins: 0,
    professionals: 0,
    clients: 0,
    total: 0,
  };

  userCounts.forEach(group => {
    switch (group.role) {
      case Role.ADMIN:
        roleCounts.admins = group._count;
        break;
      case Role.PROFESSIONAL:
        roleCounts.professionals = group._count;
        break;
      case Role.CLIENT:
        roleCounts.clients = group._count;
        break;
    }
    roleCounts.total += group._count;
  });

  // Get resource counts
  const [activeResources, totalResources] = await Promise.all([
    db.resource.count({
      where: { isActive: true, deletedAt: null },
    }),
    db.resource.count({
      where: { deletedAt: null },
    }),
  ]);

  // Get shift counts
  const now = new Date();
  const [upcomingShifts, totalShifts] = await Promise.all([
    db.shift.count({
      where: {
        startTime: { gt: now },
        deletedAt: null,
      },
    }),
    db.shift.count({
      where: { deletedAt: null },
    }),
  ]);

  // Get booking counts by status
  const bookingCounts = await db.booking.groupBy({
    by: ['status'],
    where: {
      deletedAt: null,
    },
    _count: true,
  });

  const statusCounts = {
    confirmed: 0,
    cancelled: 0,
    total: 0,
  };

  bookingCounts.forEach(group => {
    switch (group.status) {
      case BookingStatus.CONFIRMED:
        statusCounts.confirmed = group._count;
        break;
      case BookingStatus.CANCELLED:
        statusCounts.cancelled = group._count;
        break;
    }
    statusCounts.total += group._count;
  });

  // Get recent activity (last 10 bookings, shifts, user creations)
  const recentBookings = await db.booking.findMany({
    where: { deletedAt: null },
    include: {
      client: {
        select: { name: true },
      },
      shift: {
        select: {
          resource: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentShifts = await db.shift.findMany({
    where: { deletedAt: null },
    include: {
      professional: {
        select: { name: true },
      },
      resource: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentUsers = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Combine and sort recent activity
  const recentActivity = [
    ...recentBookings.map(booking => ({
      id: `booking-${booking.id}`,
      type: 'BOOKING' as const,
      timestamp: booking.createdAt,
      description: `${booking.client.name} booked ${booking.shift.resource.name}`,
    })),
    ...recentShifts.map(shift => ({
      id: `shift-${shift.id}`,
      type: 'SHIFT' as const,
      timestamp: shift.createdAt,
      description: `${shift.professional.name} created shift for ${shift.resource.name}`,
    })),
    ...recentUsers.map(user => ({
      id: `user-${user.id}`,
      type: 'USER' as const,
      timestamp: user.createdAt,
      description: `${user.name} (${user.role}) joined`,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

  return {
    userCounts: roleCounts,
    resourceCounts: {
      active: activeResources,
      total: totalResources,
    },
    shiftCounts: {
      upcoming: upcomingShifts,
      total: totalShifts,
    },
    bookingCounts: statusCounts,
    recentActivity,
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;


// Resource Management
export async function getResources() {
  return await db.resource.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}

export async function createResource(data: { name: string; description?: string; isActive: boolean }) {
  return await db.resource.create({
    data: {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    },
  });
}

export async function updateResource(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  return await db.resource.update({
    where: { id, deletedAt: null },
    data,
  });
}

export async function deleteResource(id: string) {
  // Soft delete
  return await db.resource.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

// User Management
export async function getUsers() {
  return await db.user.findMany({
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
  });
}

export type UserWithRelations = Awaited<ReturnType<typeof getUsers>>[number];

export async function updateUserRole(id: string, role: Role) {
  return await db.user.update({
    where: { id, deletedAt: null },
    data: { role },
  });
}

export async function deleteUser(id: string) {
  // Soft delete
  return await db.user.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

// Admin Tools
export async function exportData() {
  const [users, resources, shifts, bookings] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.resource.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.shift.findMany({
      where: { deletedAt: null },
      include: {
        professional: {
          select: { name: true },
        },
        resource: {
          select: { name: true },
        },
      },
    }),
    db.booking.findMany({
      where: { deletedAt: null },
      include: {
        client: {
          select: { name: true },
        },
        shift: {
          select: {
            resource: {
              select: { name: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    users,
    resources,
    shifts,
    bookings,
  };
}

export async function clearTestData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Soft delete records that were already soft-deleted more than 30 days ago
  const [users, resources, shifts, bookings] = await Promise.all([
    db.user.updateMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      data: { deletedAt: new Date() }, // Update deletedAt to now to mark for permanent removal
    }),
    db.resource.updateMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      data: { deletedAt: new Date() },
    }),
    db.shift.updateMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      data: { deletedAt: new Date() },
    }),
    db.booking.updateMany({
      where: {
        deletedAt: { not: null, lt: thirtyDaysAgo },
      },
      data: { deletedAt: new Date() },
    }),
  ]);

  return {
    clearedAt: new Date().toISOString(),
    users: users.count,
    resources: resources.count,
    shifts: shifts.count,
    bookings: bookings.count,
  };
}