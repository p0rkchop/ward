import { getServerSession } from '@/app/lib/auth';
import { getProfessionalShifts, getAvailableSlotCountForProfessional } from '@/app/lib/shift-actions';
import { getProfessionalBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { format } from 'date-fns';
import StatsCard from '../components/StatsCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ShiftWithDetails = Awaited<ReturnType<typeof getProfessionalShifts>>[number];
type BookingWithDetails = Awaited<ReturnType<typeof getProfessionalBookings>>[number];

export default async function ProfessionalDashboard() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Date boundaries
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  let todayBookings: BookingWithDetails[] = [];
  let tomorrowBookings: BookingWithDetails[] = [];
  let todayShifts: ShiftWithDetails[] = [];
  let tomorrowShifts: ShiftWithDetails[] = [];
  let availableSlots = 0;
  let stats = {
    availableSlots: 0,
    todayBookings: 0,
    tomorrowBookings: 0,
    todayShifts: 0,
  };

  try {
    // Get today & tomorrow data in parallel
    const [shifts, bookings, slotCount] = await Promise.all([
      getProfessionalShifts(professionalId, today, dayAfterTomorrow),
      getProfessionalBookings(professionalId, today, dayAfterTomorrow),
      getAvailableSlotCountForProfessional(professionalId),
    ]);

    availableSlots = slotCount;

    todayShifts = shifts.filter(s => {
      const d = new Date(s.startTime);
      return d >= today && d < tomorrow;
    });

    tomorrowShifts = shifts.filter(s => {
      const d = new Date(s.startTime);
      return d >= tomorrow && d < dayAfterTomorrow;
    });

    todayBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d >= today && d < tomorrow;
    });

    tomorrowBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d >= tomorrow && d < dayAfterTomorrow;
    });

    stats = {
      availableSlots: slotCount,
      todayBookings: todayBookings.length,
      tomorrowBookings: tomorrowBookings.length,
      todayShifts: todayShifts.length,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Day at a Glance
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {session.user.name}. Here&apos;s your schedule.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Slots"
          value={stats.availableSlots.toString()}
          description="You can sign up for"
          icon="calendar"
          href="/professional/shifts/create"
        />
        <StatsCard
          title="Today&apos;s Shifts"
          value={stats.todayShifts.toString()}
          description="Shifts today"
          icon="clock"
          href="/professional/shifts"
        />
        <StatsCard
          title="Today&apos;s Bookings"
          value={stats.todayBookings.toString()}
          description="Client appointments today"
          icon="users"
          href="/professional/bookings"
        />
        <StatsCard
          title="Tomorrow&apos;s Bookings"
          value={stats.tomorrowBookings.toString()}
          description="Client appointments tomorrow"
          icon="check-circle"
          href="/professional/bookings"
        />
      </div>

      {/* Today's Agenda */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Today &mdash; {format(today, 'EEEE, MMMM d')}
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Today's Shifts */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Your Shifts</h3>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {todayShifts.length}
              </span>
            </div>
            {todayShifts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {todayShifts.map((shift) => (
                  <li key={shift.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{shift.resource.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(shift.startTime), 'h:mm a')} &ndash; {format(new Date(shift.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {shift.bookings.length} booking{shift.bookings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No shifts scheduled for today.</p>
            )}
          </div>

          {/* Today's Client Appointments */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Client Appointments</h3>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                {todayBookings.length}
              </span>
            </div>
            {todayBookings.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {todayBookings.map((booking) => (
                  <li key={booking.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.client.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startTime), 'h:mm a')} &ndash; {format(new Date(booking.endTime), 'h:mm a')}
                        </p>
                        <p className="text-xs text-gray-400">{booking.shift.resource.name}</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Confirmed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No client appointments for today.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tomorrow's Agenda */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Tomorrow &mdash; {format(tomorrow, 'EEEE, MMMM d')}
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tomorrow's Shifts */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Your Shifts</h3>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {tomorrowShifts.length}
              </span>
            </div>
            {tomorrowShifts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {tomorrowShifts.map((shift) => (
                  <li key={shift.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{shift.resource.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(shift.startTime), 'h:mm a')} &ndash; {format(new Date(shift.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {shift.bookings.length} booking{shift.bookings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No shifts scheduled for tomorrow.</p>
            )}
          </div>

          {/* Tomorrow's Client Appointments */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Client Appointments</h3>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                {tomorrowBookings.length}
              </span>
            </div>
            {tomorrowBookings.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {tomorrowBookings.map((booking) => (
                  <li key={booking.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.client.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startTime), 'h:mm a')} &ndash; {format(new Date(booking.endTime), 'h:mm a')}
                        </p>
                        <p className="text-xs text-gray-400">{booking.shift.resource.name}</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Confirmed
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No client appointments for tomorrow.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/professional/shifts/create"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Create Shift
        </Link>
        <Link
          href="/professional/shifts"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          View All Shifts
        </Link>
        <Link
          href="/professional/calendar"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Calendar
        </Link>
      </div>
    </div>
  );
}