import { getServerSession } from '@/app/lib/auth';
import { getClientBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { formatTime, formatDateFull, formatDateTimeRange, prefsFromSession } from '@/app/lib/format-utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type BookingWithDetails = Awaited<ReturnType<typeof getClientBookings>>[number];

export default async function ClientDashboard() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.CLIENT) {
    redirect('/auth/unauthorized');
  }

  const clientId = session.user.id;

  // Date boundaries
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // Also get upcoming beyond tomorrow for the "upcoming" section
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let todayBookings: BookingWithDetails[] = [];
  let tomorrowBookings: BookingWithDetails[] = [];
  let laterBookings: BookingWithDetails[] = [];
  let stats = {
    todayAppointments: 0,
    tomorrowAppointments: 0,
    upcomingAppointments: 0,
    totalThisWeek: 0,
  };

  try {
    const bookings = await getClientBookings(clientId, today, weekEnd);

    todayBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d >= today && d < tomorrow;
    });

    tomorrowBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d >= tomorrow && d < dayAfterTomorrow;
    });

    laterBookings = bookings.filter(b => {
      const d = new Date(b.startTime);
      return d >= dayAfterTomorrow;
    });

    stats = {
      todayAppointments: todayBookings.length,
      tomorrowAppointments: tomorrowBookings.length,
      upcomingAppointments: bookings.filter(b => new Date(b.startTime) >= now).length,
      totalThisWeek: bookings.length,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  const prefs = prefsFromSession(session.user);

  const renderBookingCard = (booking: BookingWithDetails) => (
    <li key={booking.id} className="py-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatTime(new Date(booking.startTime), prefs)} &ndash; {formatTime(new Date(booking.endTime), prefs)}
            </p>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Confirmed
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            with <span className="font-medium">{booking.shift.professional.name}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {booking.shift.resource.name}
            {booking.shift.resource.location && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">&bull; {booking.shift.resource.location}</span>
            )}
          </p>
        </div>
      </div>
    </li>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Day at a Glance
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back, {session.user.name}. Here are your appointments.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/client/appointments" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Today</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.todayAppointments}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">appointment{stats.todayAppointments !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </Link>

        <Link href="/client/appointments" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Tomorrow</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.tomorrowAppointments}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">appointment{stats.tomorrowAppointments !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </Link>

        <Link href="/client/appointments" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-purple-100 p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.upcomingAppointments}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">total upcoming</div>
            </div>
          </div>
        </Link>

        <Link href="/client/book" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-yellow-100 p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">This Week</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalThisWeek}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">total this week</div>
            </div>
          </div>
        </Link>
      </div>

      <div className="space-y-8">
        {/* Today */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Today &mdash; {formatDateFull(today, prefs)}
          </h2>
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            {todayBookings.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {todayBookings.map(renderBookingCard)}
              </ul>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">No appointments today.</p>
                <Link
                  href="/client/book"
                  className="mt-3 inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  Book Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tomorrow */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Tomorrow &mdash; {formatDateFull(tomorrow, prefs)}
          </h2>
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            {tomorrowBookings.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {tomorrowBookings.map(renderBookingCard)}
              </ul>
            ) : (
              <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No appointments tomorrow.</p>
            )}
          </div>
        </div>

        {/* Later This Week */}
        {laterBookings.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Later This Week</h2>
            <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {laterBookings.map((booking) => (
                  <li key={booking.id} className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDateTimeRange(new Date(booking.startTime), new Date(booking.endTime), prefs)}
                          </p>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Confirmed
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          with <span className="font-medium">{booking.shift.professional.name}</span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.shift.resource.name}
                          {booking.shift.resource.location && (
                            <span className="ml-1 text-gray-400 dark:text-gray-500">&bull; {booking.shift.resource.location}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/client/book"
          className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
        >
          Book Appointment
        </Link>
        <Link
          href="/client/appointments"
          className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          All Appointments
        </Link>
      </div>
    </div>
  );
}