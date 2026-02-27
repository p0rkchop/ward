import { getServerSession } from '@/app/lib/auth';
import { getProfessionalBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProfessionalBookingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Get all upcoming bookings (from today onward)
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let upcomingBookings: Awaited<ReturnType<typeof getProfessionalBookings>> = [];
  let pastBookings: Awaited<ReturnType<typeof getProfessionalBookings>> = [];

  try {
    const allBookings = await getProfessionalBookings(professionalId);
    upcomingBookings = allBookings.filter(b => new Date(b.startTime) >= today);
    pastBookings = allBookings
      .filter(b => new Date(b.startTime) < today)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } catch (error) {
    console.error('Error fetching bookings:', error);
  }

  const renderBookingRow = (booking: Awaited<ReturnType<typeof getProfessionalBookings>>[number]) => (
    <tr key={booking.id}>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {format(new Date(booking.startTime), 'EEE, MMM d, yyyy')}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {format(new Date(booking.startTime), 'h:mm a')} &ndash; {format(new Date(booking.endTime), 'h:mm a')}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
        {booking.client.name}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {booking.client.phoneNumber}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {booking.shift.resource.name}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Confirmed
        </span>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">
          All client appointments booked on your shifts.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 flex gap-4">
        <div className="rounded-lg bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {upcomingBookings.length} upcoming
          </span>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-600">
            {pastBookings.length} past
          </span>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Upcoming</h2>
        {upcomingBookings.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {upcomingBookings.map(renderBookingRow)}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">No upcoming bookings.</p>
            <Link
              href="/professional/shifts/create"
              className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create a Shift
            </Link>
          </div>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Past</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastBookings.map(renderBookingRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/professional/shifts"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          View Shifts
        </Link>
        <Link
          href="/professional/dashboard"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
