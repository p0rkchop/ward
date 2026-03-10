import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { sendAppointmentReminder } from '@/app/lib/email';
import { sendPushToUser } from '@/app/lib/push';
import type { BookingEmailData } from '@/app/lib/email';

/**
 * GET /api/cron/reminders
 *
 * Sends appointment reminder emails to clients and professionals
 * with confirmed bookings in the next 24 hours.
 * Designed to be called by Vercel Cron (once daily).
 */
export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find confirmed bookings starting in the next 24 hours
  const bookings = await db.booking.findMany({
    where: {
      deletedAt: null,
      status: 'CONFIRMED',
      startTime: { gte: now, lte: in24h },
    },
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

  let sent = 0;

  for (const booking of bookings) {
    const data: BookingEmailData = {
      startTime: booking.startTime,
      endTime: booking.endTime,
      professionalName: booking.shift.professional.name ?? 'TBD',
      resourceName: booking.shift.resource.name,
      resourceLocation: booking.shift.resource.location,
    };

    // Remind client
    if (booking.client.email && booking.client.notifyViaEmail) {
      sendAppointmentReminder(booking.client.email, booking.client.name ?? 'Client', data).catch(() => {});
      sent++;
    }

    // Push remind client
    if (booking.client.notifyViaPush) {
      sendPushToUser(booking.client.id, {
        title: 'Upcoming Appointment',
        body: `Reminder: You have an appointment with ${data.professionalName} coming up.`,
        url: '/client/appointments',
      }).catch(() => {});
      sent++;
    }

    // Remind professional
    if (booking.shift.professional.email && booking.shift.professional.notifyViaEmail) {
      sendAppointmentReminder(booking.shift.professional.email, booking.shift.professional.name ?? 'Professional', data).catch(() => {});
      sent++;
    }

    // Push remind professional
    if (booking.shift.professional.notifyViaPush) {
      sendPushToUser(booking.shift.professional.id, {
        title: 'Upcoming Appointment',
        body: `Reminder: You have an appointment with ${booking.client.name ?? 'a client'} coming up.`,
        url: '/professional/calendar',
      }).catch(() => {});
      sent++;
    }
  }

  return NextResponse.json({
    ok: true,
    bookings: bookings.length,
    remindersSent: sent,
    checkedAt: now.toISOString(),
  });
}
