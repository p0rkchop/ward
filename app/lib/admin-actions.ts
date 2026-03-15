'use server';

import { db } from './db';
import { getServerSession } from './auth';
import { Role, BookingStatus } from '@/app/generated/prisma/enums';
import { sendAdminCancellation, sendBookingReassignment, sendRoleChanged, sendAccountDeleted, sendProfessionalBookingCancelled, sendShiftCancelled, sendTestEmail } from '@/app/lib/email';
import { sendPushToUser } from '@/app/lib/push';
import type { EmailTestResult } from '@/app/lib/email';

/**
 * Verify that the current user is an ADMIN.
 * All admin actions must call this before performing mutations.
 */
async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  if (session.user.role !== Role.ADMIN) {
    throw new Error('Admin access required');
  }
  return session.user;
}

export async function getAdminStats() {
  await requireAdmin();
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
  await requireAdmin();
  return await db.resource.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}

export async function createResource(data: { name: string; description?: string; location?: string; quantity: number; professionalsPerUnit: number; staffOnly?: boolean; isActive: boolean }) {
  await requireAdmin();
  return await db.resource.create({
    data: {
      name: data.name,
      description: data.description,
      location: data.location,
      quantity: data.quantity,
      professionalsPerUnit: data.professionalsPerUnit,
      staffOnly: data.staffOnly ?? false,
      isActive: data.isActive,
    },
  });
}

export async function updateResource(id: string, data: { name?: string; description?: string; location?: string; quantity?: number; professionalsPerUnit?: number; staffOnly?: boolean; isActive?: boolean }) {
  await requireAdmin();
  return await db.resource.update({
    where: { id, deletedAt: null },
    data,
  });
}

/**
 * Cascade-cancel an array of shifts and their bookings, sending notifications.
 * Used internally by deleteResource, deleteEvent, unassignResource, deleteUser.
 * Returns counts of cancelled shifts and bookings.
 */
export async function cascadeCancelShifts(
  shiftIds: string[]
): Promise<{ cancelledShifts: number; cancelledBookings: number }> {
  let cancelledShifts = 0;
  let cancelledBookings = 0;

  for (const shiftId of shiftIds) {
    // Fetch the shift with its bookings, professional, and resource for notifications
    const shift = await db.shift.findUnique({
      where: { id: shiftId },
      include: {
        professional: {
          select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true },
        },
        resource: {
          select: { id: true, name: true, description: true, location: true },
        },
        bookings: {
          where: { deletedAt: null, status: 'CONFIRMED' },
          include: {
            client: {
              select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true },
            },
          },
        },
      },
    });

    if (!shift) continue;

    // Hard-delete each booking and notify client + professional
    for (const booking of shift.bookings) {
      await db.booking.delete({ where: { id: booking.id } });
      cancelledBookings++;

      const emailData = {
        startTime: booking.startTime,
        endTime: booking.endTime,
        professionalName: shift.professional.name ?? 'TBD',
        resourceName: shift.resource.name,
        resourceLocation: shift.resource.location,
      };

      // Notify client
      if (booking.client?.email && booking.client.notifyViaEmail) {
        sendAdminCancellation(booking.client.email, emailData).catch(() => {});
      }
      if (booking.client?.notifyViaPush) {
        sendPushToUser(booking.client.id, {
          title: 'Booking Cancelled',
          body: `Your appointment with ${emailData.professionalName} has been cancelled by an administrator.`,
          url: '/client/appointments',
        }).catch(() => {});
      }

      // Notify professional
      if (shift.professional.email && shift.professional.notifyViaEmail) {
        sendProfessionalBookingCancelled(
          shift.professional.email,
          booking.client?.name ?? 'Client',
          emailData,
          'admin',
        ).catch(() => {});
      }
      if (shift.professional.notifyViaPush) {
        sendPushToUser(shift.professional.id, {
          title: 'Booking Cancelled',
          body: `${booking.client?.name ?? 'A client'}'s appointment was cancelled by an administrator.`,
          url: '/professional/bookings',
        }).catch(() => {});
      }
    }

    // Soft-delete the shift
    await db.shift.update({
      where: { id: shiftId },
      data: { deletedAt: new Date() },
    });
    cancelledShifts++;

    // Notify professional that their shift was cancelled (if no bookings already notified them)
    if (shift.professional.email && shift.professional.notifyViaEmail) {
      const shiftEmailData = {
        startTime: shift.startTime,
        endTime: shift.endTime,
        professionalName: shift.professional.name ?? 'TBD',
        resourceName: shift.resource.name,
        resourceLocation: shift.resource.location,
      };
      sendShiftCancelled(shift.professional.email, shiftEmailData).catch(() => {});
    }
    if (shift.professional.notifyViaPush) {
      sendPushToUser(shift.professional.id, {
        title: 'Shift Cancelled',
        body: `Your shift on ${shift.resource.name} was cancelled by an administrator.`,
        url: '/professional/shifts',
      }).catch(() => {});
    }
  }

  return { cancelledShifts, cancelledBookings };
}

export async function deleteResource(id: string) {
  await requireAdmin();

  // Find all active shifts on this resource
  const shifts = await db.shift.findMany({
    where: { resourceId: id, deletedAt: null },
    select: { id: true },
  });

  // Cascade-cancel shifts and their bookings with notifications
  const { cancelledShifts, cancelledBookings } = await cascadeCancelShifts(
    shifts.map((s) => s.id)
  );

  // Soft-delete EventResource assignments
  await db.eventResource.updateMany({
    where: { resourceId: id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // Soft-delete the resource
  await db.resource.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return { cancelledShifts, cancelledBookings };
}

// User Management
export async function getUsers() {
  await requireAdmin();
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
      event: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export type UserWithRelations = Awaited<ReturnType<typeof getUsers>>[number];

export async function updateUserRole(id: string, role: Role) {
  await requireAdmin();
  const user = await db.user.update({
    where: { id, deletedAt: null },
    data: { role },
    select: { email: true, name: true },
  });

  // Fire-and-forget: notify user of role change
  if (user.email) {
    sendRoleChanged(user.email, user.name ?? 'User', role).catch(() => {});
  }

  return user;
}

export async function deleteUser(id: string) {
  await requireAdmin();

  // Find user to determine role
  const user = await db.user.findUnique({
    where: { id, deletedAt: null },
    select: { role: true, email: true, name: true, eventId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Cascade: if professional, cancel their shifts (and those shifts' bookings)
  if (user.role === 'PROFESSIONAL') {
    const shifts = await db.shift.findMany({
      where: { professionalId: id, deletedAt: null },
      select: { id: true },
    });
    await cascadeCancelShifts(shifts.map((s) => s.id));
  }

  // Cascade: if client, cancel their bookings
  if (user.role === 'CLIENT') {
    const bookings = await db.booking.findMany({
      where: { clientId: id, deletedAt: null, status: 'CONFIRMED' },
      include: {
        shift: {
          include: {
            professional: {
              select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true },
            },
            resource: {
              select: { id: true, name: true, description: true, location: true },
            },
          },
        },
      },
    });

    for (const booking of bookings) {
      await db.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', deletedAt: new Date() },
      });

      // Notify professional that the booking was cancelled
      const emailData = {
        startTime: booking.startTime,
        endTime: booking.endTime,
        professionalName: booking.shift.professional.name ?? 'TBD',
        resourceName: booking.shift.resource.name,
        resourceLocation: booking.shift.resource.location,
      };
      if (booking.shift.professional.email && booking.shift.professional.notifyViaEmail) {
        sendProfessionalBookingCancelled(
          booking.shift.professional.email,
          user.name ?? 'Client',
          emailData,
          'admin',
        ).catch(() => {});
      }
      if (booking.shift.professional.notifyViaPush) {
        sendPushToUser(booking.shift.professional.id, {
          title: 'Booking Cancelled',
          body: `${user.name ?? 'A client'}'s account was removed. Their appointment was cancelled.`,
          url: '/professional/bookings',
        }).catch(() => {});
      }
    }
  }

  // Clean up push subscriptions
  await db.pushSubscription.deleteMany({
    where: { userId: id },
  });

  // Unlink from event
  if (user.eventId) {
    await db.user.update({
      where: { id },
      data: { eventId: null },
    });
  }

  // Soft delete the user
  const deletedUser = await db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { email: true, name: true, deletedAt: true },
  });

  // Fire-and-forget: notify user of account removal
  if (deletedUser.email) {
    sendAccountDeleted(deletedUser.email, deletedUser.name ?? 'User').catch(() => {});
  }

  return deletedUser;
}

// Admin Tools
// Maximum records per entity to export. Prevents exceeding Vercel's
// serverless response body limit (~4.5 MB) and function timeout.
const EXPORT_LIMIT = 5000;

export async function exportData() {
  await requireAdmin();
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
      take: EXPORT_LIMIT,
      orderBy: { createdAt: 'desc' },
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
      take: EXPORT_LIMIT,
      orderBy: { createdAt: 'desc' },
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
      take: EXPORT_LIMIT,
      orderBy: { createdAt: 'desc' },
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
      take: EXPORT_LIMIT,
      orderBy: { createdAt: 'desc' },
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
  await requireAdmin();
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

// ── Admin Booking Management ──

export type EventBookingData = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  professionalId: string;
  professionalName: string;
  resourceName: string;
  resourceLocation: string | null;
  shiftId: string;
};

/**
 * Get all bookings for an event (across all resources assigned to the event)
 */
export async function getEventBookings(eventId: string): Promise<EventBookingData[]> {
  await requireAdmin();

  // Get resource IDs assigned to this event
  const eventResources = await db.eventResource.findMany({
    where: { eventId, deletedAt: null },
    select: { resourceId: true },
  });
  const resourceIds = eventResources.map((er) => er.resourceId);

  if (resourceIds.length === 0) return [];

  // Get all bookings on shifts for those resources
  const bookings = await db.booking.findMany({
    where: {
      deletedAt: null,
      status: BookingStatus.CONFIRMED,
      shift: {
        deletedAt: null,
        resourceId: { in: resourceIds },
      },
    },
    include: {
      client: {
        select: { id: true, name: true, phoneNumber: true },
      },
      shift: {
        include: {
          professional: {
            select: { id: true, name: true },
          },
          resource: {
            select: { name: true, location: true },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  return bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    clientId: b.client.id,
    clientName: b.client.name,
    clientPhone: b.client.phoneNumber,
    professionalId: b.shift.professional.id,
    professionalName: b.shift.professional.name,
    resourceName: b.shift.resource.name,
    resourceLocation: b.shift.resource.location,
    shiftId: b.shiftId,
  }));
}

/**
 * Get available shifts for an event that a booking could be reassigned to.
 * Returns shifts with capacity (no existing confirmed booking for the same timeslot).
 */
export async function getEventAvailableShifts(eventId: string, start: Date, end: Date) {
  await requireAdmin();

  const eventResources = await db.eventResource.findMany({
    where: { eventId, deletedAt: null },
    select: { resourceId: true },
  });
  const resourceIds = eventResources.map((er) => er.resourceId);

  if (resourceIds.length === 0) return [];

  // Find shifts covering the requested timeslot
  const shifts = await db.shift.findMany({
    where: {
      deletedAt: null,
      resourceId: { in: resourceIds },
      startTime: { lte: start },
      endTime: { gte: end },
    },
    include: {
      professional: {
        select: { id: true, name: true },
      },
      resource: {
        select: { id: true, name: true, location: true },
      },
      bookings: {
        where: {
          deletedAt: null,
          status: BookingStatus.CONFIRMED,
          startTime: start,
          endTime: end,
        },
        select: { id: true },
      },
    },
  });

  // Only return shifts with available capacity
  return shifts
    .filter((s) => s.bookings.length === 0)
    .map((s) => ({
      id: s.id,
      professionalId: s.professional.id,
      professionalName: s.professional.name,
      resourceName: s.resource.name,
      resourceLocation: s.resource.location,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
}

/**
 * Reassign a booking to a different shift (different professional and/or timeslot)
 */
export async function reassignBooking(
  bookingId: string,
  newShiftId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        client: { select: { id: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
        shift: {
          include: {
            professional: { select: { name: true } },
            resource: { select: { name: true, location: true } },
          },
        },
      },
    });
    if (!booking) return { ok: false, error: 'Booking not found' };

    // Verify target shift exists and has capacity
    const existingBooking = await db.booking.findFirst({
      where: {
        shiftId: newShiftId,
        deletedAt: null,
        status: BookingStatus.CONFIRMED,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
    });
    if (existingBooking) {
      return { ok: false, error: 'Target shift already has a booking for this timeslot' };
    }

    await db.booking.update({
      where: { id: bookingId },
      data: { shiftId: newShiftId },
    });

    // Fire-and-forget: notify client of reassignment if email on file
    if (booking.client.email && booking.client.notifyViaEmail) {
      // Fetch new shift details for the reassignment email
      const newShift = await db.shift.findUnique({
        where: { id: newShiftId },
        include: {
          professional: { select: { name: true } },
          resource: { select: { name: true, location: true } },
        },
      });
      if (newShift) {
        const oldData = {
          startTime: booking.startTime,
          endTime: booking.endTime,
          professionalName: booking.shift.professional.name ?? 'TBD',
          resourceName: booking.shift.resource.name,
          resourceLocation: booking.shift.resource.location,
        };
        const newData = {
          startTime: booking.startTime,
          endTime: booking.endTime,
          professionalName: newShift.professional.name ?? 'TBD',
          resourceName: newShift.resource.name,
          resourceLocation: newShift.resource.location,
        };
        sendBookingReassignment(booking.client.email, oldData, newData).catch(() => {});
      }
    }

    // Fire-and-forget: push notification to client about reassignment
    if (booking.client.notifyViaPush) {
      sendPushToUser(booking.client.id, {
        title: 'Booking Reassigned',
        body: 'Your appointment has been reassigned to a different professional or time.',
        url: '/client/appointments',
      }).catch(() => {});
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reassignBooking] Error:', msg);
    return { ok: false, error: 'Failed to reassign booking' };
  }
}

/**
 * Admin-remove a booking (soft-delete + cancel status)
 */
export async function adminRemoveBooking(
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
        shift: {
          include: {
            professional: { select: { id: true, name: true, email: true, notifyViaEmail: true, notifyViaPush: true } },
            resource: { select: { name: true, location: true } },
          },
        },
      },
    });
    if (!booking) return { ok: false, error: 'Booking not found' };

    // Hard-delete so the unique constraint slot is freed for re-booking
    await db.booking.delete({ where: { id: bookingId } });

    const emailData = {
      startTime: booking.startTime,
      endTime: booking.endTime,
      professionalName: booking.shift.professional.name ?? 'TBD',
      resourceName: booking.shift.resource.name,
      resourceLocation: booking.shift.resource.location,
    };

    // Fire-and-forget: notify client if email on file
    if (booking.client.email && booking.client.notifyViaEmail) {
      sendAdminCancellation(booking.client.email, emailData).catch(() => {});
    }

    // Fire-and-forget: push notification to client
    if (booking.client.notifyViaPush) {
      sendPushToUser(booking.client.id, {
        title: 'Booking Cancelled',
        body: `Your appointment with ${emailData.professionalName} has been cancelled by an administrator.`,
        url: '/client/appointments',
      }).catch(() => {});
    }

    // Fire-and-forget: notify professional that a slot freed up
    if (booking.shift.professional.email && booking.shift.professional.notifyViaEmail) {
      sendProfessionalBookingCancelled(
        booking.shift.professional.email,
        booking.client.name ?? 'Client',
        emailData,
        'admin',
      ).catch(() => {});
    }

    // Fire-and-forget: push notification to professional
    if (booking.shift.professional.notifyViaPush) {
      sendPushToUser(booking.shift.professional.id, {
        title: 'Booking Cancelled',
        body: `${booking.client.name ?? 'A client'}'s appointment was cancelled by an administrator.`,
        url: '/professional/bookings',
      }).catch(() => {});
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[adminRemoveBooking] Error:', msg);
    return { ok: false, error: 'Failed to remove booking' };
  }
}

// ── Event Agenda ──

export type AgendaDayData = {
  date: string; // ISO date string e.g. "2026-03-01"
  dayId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  shifts: AgendaShiftData[];
};

export type AgendaShiftData = {
  id: string;
  startTime: Date;
  endTime: Date;
  professionalName: string;
  resourceName: string;
  resourceLocation: string | null;
  bookings: AgendaBookingData[];
};

export type AgendaBookingData = {
  id: string;
  startTime: Date;
  endTime: Date;
  clientName: string;
  clientPhone: string;
  status: string;
};

/**
 * Get a full agenda for an event: days → shifts → bookings
 */
export async function getEventAgenda(eventId: string): Promise<AgendaDayData[]> {
  await requireAdmin();

  // Get event days
  const days = await db.eventDay.findMany({
    where: { eventId, deletedAt: null },
    orderBy: { date: 'asc' },
  });

  // Get resource IDs for this event
  const eventResources = await db.eventResource.findMany({
    where: { eventId, deletedAt: null },
    select: { resourceId: true },
  });
  const resourceIds = eventResources.map((er) => er.resourceId);

  if (resourceIds.length === 0) {
    return days.map((d) => ({
      date: new Date(d.date).toISOString().split('T')[0],
      dayId: d.id,
      startTime: d.startTime,
      endTime: d.endTime,
      isActive: d.isActive,
      shifts: [],
    }));
  }

  // Get all shifts + bookings across the event's date range for event resources
  const allShifts = await db.shift.findMany({
    where: {
      deletedAt: null,
      resourceId: { in: resourceIds },
    },
    include: {
      professional: { select: { name: true } },
      resource: { select: { name: true, location: true } },
      bookings: {
        where: { deletedAt: null },
        include: {
          client: { select: { name: true, phoneNumber: true } },
        },
        orderBy: { startTime: 'asc' },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Group shifts by date
  const shiftsByDate = new Map<string, typeof allShifts>();
  for (const shift of allShifts) {
    const dateStr = new Date(shift.startTime).toISOString().split('T')[0];
    if (!shiftsByDate.has(dateStr)) shiftsByDate.set(dateStr, []);
    shiftsByDate.get(dateStr)!.push(shift);
  }

  return days.map((d) => {
    const dateStr = new Date(d.date).toISOString().split('T')[0];
    const dayShifts = shiftsByDate.get(dateStr) || [];

    return {
      date: dateStr,
      dayId: d.id,
      startTime: d.startTime,
      endTime: d.endTime,
      isActive: d.isActive,
      shifts: dayShifts.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        professionalName: s.professional.name,
        resourceName: s.resource.name,
        resourceLocation: s.resource.location,
        bookings: s.bookings.map((b) => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
          clientName: b.client.name,
          clientPhone: b.client.phoneNumber,
          status: b.status,
        })),
      })),
    };
  });
}

export async function testEmailConnectivity(email: string): Promise<EmailTestResult> {
  await requireAdmin();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      steps: [{ label: 'Valid email address', ok: false, detail: 'Please enter a valid email address' }],
    };
  }

  return sendTestEmail(email);
}

/**
 * DANGER: Permanently hard-deletes all scheduling data.
 * Preserves only the calling admin user account.
 * Cannot be undone.
 */
export async function resetAllData(): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  try {
    // Delete in dependency order to respect foreign keys
    const [bookings, eventDayBlackouts, eventDays, eventResources, shifts, events, resources, users] =
      await db.$transaction([
        db.booking.deleteMany({}),
        db.eventDayBlackout.deleteMany({}),
        db.eventDay.deleteMany({}),
        db.eventResource.deleteMany({}),
        db.shift.deleteMany({}),
        db.event.deleteMany({}),
        db.resource.deleteMany({}),
        // Delete all users except the calling admin
        db.user.deleteMany({ where: { id: { not: admin.id } } }),
      ]);

    // Reset AppSettings (clear branding, restore defaults)
    await db.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', brandingImageUrl: null, siteName: 'Ward', timeslotDuration: 30 },
      update: { brandingImageUrl: null, siteName: 'Ward', timeslotDuration: 30 },
    });

    const summary =
      `Deleted: ${bookings.count} bookings, ${shifts.count} shifts, ` +
      `${events.count} events, ${eventDays.count} event days, ` +
      `${eventDayBlackouts.count} blackouts, ${eventResources.count} event resources, ` +
      `${resources.count} resources, ${users.count} users (admin preserved).`;

    console.log(`[resetAllData] Complete by admin ${admin.id}. ${summary}`);
    return { ok: true, summary };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[resetAllData] Error:', msg);
    return { ok: false, error: 'Reset failed: ' + msg };
  }
}