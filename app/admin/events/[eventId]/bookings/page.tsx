import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { db } from '@/app/lib/db';
import { getEventBookings } from '@/app/lib/admin-actions';
import BookingsManager from './components/BookingsManager';

export const dynamic = 'force-dynamic';

export default async function EventBookingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  const { eventId } = await params;

  const event = await db.event.findUnique({
    where: { id: eventId, deletedAt: null },
    select: { id: true, name: true, startDate: true, endDate: true, timezone: true },
  });

  if (!event) {
    redirect('/admin/events');
  }

  const bookings = await getEventBookings(eventId);

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a
            href="/admin/events"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; Back to Events
          </a>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bookings — {event.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage client appointments for this event. Reassign to different professionals or remove bookings.
          </p>
        </div>
        <BookingsManager eventId={eventId} initialBookings={bookings} />
      </div>
    </div>
  );
}
