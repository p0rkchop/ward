import { getProfessionalBookings } from '@/app/lib/booking-actions';
import { format } from 'date-fns';

interface RecentBookingsProps {
  bookings: Awaited<ReturnType<typeof getProfessionalBookings>>;
}

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  // Sort by most recent
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  if (recentBookings.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Bookings</h3>
          <p className="mt-1 text-sm text-gray-500">No bookings in the next 7 days</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center text-gray-500">
            <p>Bookings will appear here when clients book your shifts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Bookings</h3>
            <p className="mt-1 text-sm text-gray-500">Latest bookings on your shifts</p>
          </div>
          <a
            href="/professional/bookings"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all
          </a>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {recentBookings.map((booking) => {
            const startTime = new Date(booking.startTime);
            const endTime = new Date(booking.endTime);

            return (
              <li key={booking.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {booking.client.name}
                      </p>
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {booking.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>
                        {format(startTime, 'MMM d, yyyy')} • {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                      </p>
                      <p className="mt-1">
                        Resource: {booking.shift.resource.name}
                        {booking.notes && ` • Notes: ${booking.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="text-sm text-gray-500">
                      {format(new Date(booking.createdAt), 'MMM d')}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}