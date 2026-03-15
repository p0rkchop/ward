import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { db } from '@/app/lib/db';
import { formatDateFull, formatTimeRange, formatDateShort, prefsFromSession } from '@/app/lib/format-utils';

export const dynamic = 'force-dynamic';

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: {
        select: { id: true, name: true, phoneNumber: true, email: true },
      },
      shift: {
        include: {
          professional: {
            select: { id: true, name: true },
          },
          resource: {
            select: { id: true, name: true, description: true, location: true },
          },
        },
      },
    },
  });

  if (!booking) {
    redirect('/professional/calendar');
  }

  // Only allow viewing bookings on own shifts
  if (booking.shift.professionalId !== session.user.id) {
    redirect('/professional/calendar');
  }

  const prefs = prefsFromSession(session.user);
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const isPast = start < new Date();
  const isCancelled = !!booking.deletedAt || booking.status === 'CANCELLED';

  return (
    <div>
      <div className="mb-8">
        <a
          href="/professional/calendar"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </a>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Appointment Details
        </h1>
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-900 shadow overflow-hidden">
        {/* Status banner */}
        {isCancelled ? (
          <div className="bg-red-50 dark:bg-red-900/30 px-6 py-3">
            <span className="text-sm font-medium text-red-800 dark:text-red-300">Cancelled</span>
          </div>
        ) : isPast ? (
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</span>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/30 px-6 py-3">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">Confirmed</span>
          </div>
        )}

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Client */}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {booking.client.name ?? 'Unknown'}
              </dd>
            </div>

            {/* Phone */}
            {booking.client.phoneNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                  {booking.client.phoneNumber}
                </dd>
              </div>
            )}

            {/* Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateFull(start, prefs)}
              </dd>
            </div>

            {/* Time */}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTimeRange(start, end, prefs)}
              </dd>
            </div>

            {/* Duration */}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {durationMinutes} minutes
              </dd>
            </div>

            {/* Resource */}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Resource</dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {booking.shift.resource.name}
              </dd>
              {booking.shift.resource.description && (
                <dd className="text-sm text-gray-500 dark:text-gray-400">
                  {booking.shift.resource.description}
                </dd>
              )}
            </div>

            {/* Location */}
            {booking.shift.resource.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                  {booking.shift.resource.location}
                </dd>
              </div>
            )}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Client Notes</dt>
              <dd className="mt-2 rounded-md bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-900 dark:text-gray-100">
                {booking.notes}
              </dd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
