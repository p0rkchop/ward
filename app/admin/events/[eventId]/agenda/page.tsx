import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { db } from '@/app/lib/db';
import { getEventAgenda } from '@/app/lib/admin-actions';
import AgendaView from './components/AgendaView';

export const dynamic = 'force-dynamic';

export default async function EventAgendaPage({
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
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      timezone: true,
      _count: { select: { professionals: true } },
    },
  });

  if (!event) {
    redirect('/admin/events');
  }

  const agenda = await getEventAgenda(eventId);

  // Compute summary stats
  const totalShifts = agenda.reduce((sum, d) => sum + d.shifts.length, 0);
  const totalBookings = agenda.reduce(
    (sum, d) => sum + d.shifts.reduce((s, sh) => s + sh.bookings.length, 0),
    0
  );
  const activeDays = agenda.filter((d) => d.isActive).length;

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
            Agenda — {event.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {event.timezone}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Active Days</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeDays}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Professionals</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event._count.professionals}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Shifts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalShifts}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Bookings</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalBookings}</p>
          </div>
        </div>

        <AgendaView agenda={agenda} />
      </div>
    </div>
  );
}
