import { getServerSession } from '@/app/lib/auth';
import { getClientBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import AppointmentsTable from './components/AppointmentsTable';

export const dynamic = 'force-dynamic';

export default async function ClientAppointments() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.CLIENT) {
    redirect('/auth/unauthorized');
  }

  const clientId = session.user.id;

  let bookings: Awaited<ReturnType<typeof getClientBookings>> = [];
  try {
    bookings = await getClientBookings(clientId);
  } catch (error) {
    console.error('Error fetching appointments:', error);
  }

  // Separate bookings into upcoming and past
  const now = new Date();
  const upcomingBookings = bookings.filter(booking => new Date(booking.startTime) >= now);
  const pastBookings = bookings.filter(booking => new Date(booking.startTime) < now);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Appointments</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View and manage your upcoming and past appointments.
            </p>
          </div>
          <a
            href="/client/book"
            className="rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
          >
            Book New Appointment
          </a>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Appointments</h2>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {upcomingBookings.length} appointment{upcomingBookings.length !== 1 ? 's' : ''}
          </span>
        </div>
        {upcomingBookings.length > 0 ? (
          <AppointmentsTable bookings={upcomingBookings} clientId={clientId} />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <div className="mx-auto max-w-md">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No upcoming appointments</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Book your first appointment to get started.
              </p>
              <div className="mt-6">
                <a
                  href="/client/book"
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  Book Appointment
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {pastBookings.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Past Appointments</h2>
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {pastBookings.length} appointment{pastBookings.length !== 1 ? 's' : ''}
            </span>
          </div>
          <AppointmentsTable bookings={pastBookings} clientId={clientId} isPast />
        </div>
      )}
    </div>
  );
}