import { getServerSession } from '@/app/lib/auth';
import { getClientBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { format } from 'date-fns';
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

  // Get bookings for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  let bookings: BookingWithDetails[] = [];
  let stats = {
    totalAppointments: 0,
    upcomingAppointments: 0,
    todayAppointments: 0,
    pastAppointments: 0,
  };

  try {
    bookings = await getClientBookings(clientId, startDate, endDate);

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    stats = {
      totalAppointments: bookings.length,
      upcomingAppointments: bookings.filter(b => new Date(b.startTime) >= now).length,
      todayAppointments: bookings.filter(b => {
        const bookingDate = new Date(b.startTime);
        return bookingDate >= today && bookingDate < tomorrow;
      }).length,
      pastAppointments: bookings.filter(b => new Date(b.startTime) < now).length,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Continue with empty data
  }

  // Separate upcoming and past appointments
  const now = new Date();
  const upcomingAppointments = bookings.filter(b => new Date(b.startTime) >= now);
  const pastAppointments = bookings.filter(b => new Date(b.startTime) < now);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Client Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {session.user.name}. Here's what's happening with your appointments.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500">Total Appointments</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalAppointments}</div>
              <div className="text-sm text-gray-500">In the next 7 days</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500">Upcoming Appointments</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.upcomingAppointments}</div>
              <div className="text-sm text-gray-500">Starting from today</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-yellow-100 p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500">Today&apos;s Appointments</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.todayAppointments}</div>
              <div className="text-sm text-gray-500">Bookings for today</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md bg-gray-100 p-3">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5">
              <div className="text-sm font-medium text-gray-500">Past Appointments</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{stats.pastAppointments}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium leading-6 text-gray-900">Upcoming Appointments</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {upcomingAppointments.length} appointment{upcomingAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {upcomingAppointments.map((booking) => (
                  <li key={booking.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {booking.shift.resource.name}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          with {booking.shift.professional.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startTime), 'MMM d, yyyy h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <div>
                        <Link
                          href={`/client/appointments`}
                          className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/client/appointments"
                  className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  View all appointments
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No upcoming appointments</h3>
              <p className="mt-2 text-gray-500">
                Book your first appointment to get started.
              </p>
              <div className="mt-6">
                <Link
                  href="/client/book"
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  Book Appointment
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Past Appointments */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium leading-6 text-gray-900">Recent Past Appointments</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
              {pastAppointments.length} appointment{pastAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
          {pastAppointments.length > 0 ? (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {pastAppointments.slice(0, 3).map((booking) => (
                  <li key={booking.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {booking.shift.resource.name}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          with {booking.shift.professional.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startTime), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                          Completed
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {pastAppointments.length > 3 && (
                <div className="mt-6">
                  <Link
                    href="/client/appointments"
                    className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    View all past appointments
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No past appointments</h3>
              <p className="mt-2 text-gray-500">
                You haven't completed any appointments yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}