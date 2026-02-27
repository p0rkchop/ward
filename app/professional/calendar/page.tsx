import { getServerSession } from '@/app/lib/auth';
import { getProfessionalShifts } from '@/app/lib/shift-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { formatTimeRange, formatTimeString, formatTime, prefsFromSession } from '@/app/lib/format-utils';

export const dynamic = 'force-dynamic';

export default async function ProfessionalCalendar() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Get shifts for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  let shifts: Awaited<ReturnType<typeof getProfessionalShifts>> = [];
  try {
    shifts = await getProfessionalShifts(professionalId, startDate, endDate);
  } catch (error) {
    console.error('Error fetching shifts:', error);
  }

  const prefs = prefsFromSession(session.user);

  // Create week view
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Time slots (9 AM to 5 PM)
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Calendar</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your shifts and bookings for the week.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Weekly Schedule</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700">
                Previous
              </button>
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Today
              </button>
              <button className="rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700">
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Desktop calendar (hidden on mobile) */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Time
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="col-span-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-center"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`mt-1 text-2xl font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {formatTimeString(timeSlot, prefs)}
                </div>
                {weekDays.map((day) => {
                  const shiftsForSlot = shifts.filter((shift) => {
                    const shiftStart = new Date(shift.startTime);
                    const shiftEnd = new Date(shift.endTime);
                    const slotTime = new Date(day);
                    const [hours, minutes] = timeSlot.split(':').map(Number);
                    slotTime.setHours(hours, minutes, 0, 0);

                    return isSameDay(shiftStart, day) &&
                      shiftStart.getTime() <= slotTime.getTime() &&
                      shiftEnd.getTime() > slotTime.getTime();
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="col-span-1 border-r border-gray-200 dark:border-gray-700 p-4 min-h-[80px]"
                    >
                      {shiftsForSlot.map((shift) => (
                        <div
                          key={shift.id}
                          className="mb-2 rounded-md bg-blue-100 p-2 text-xs"
                        >
                          <div className="font-medium text-blue-900">
                            {shift.resource.name}
                          </div>
                          <div className="text-blue-700">
                            {formatTimeRange(new Date(shift.startTime), new Date(shift.endTime), prefs)}
                          </div>
                          <div className="mt-1 text-blue-600">
                            {shift.bookings.length} booking{shift.bookings.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile calendar (list view) */}
          <div className="sm:hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Weekly Schedule</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Swipe horizontally to view different days
              </p>
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                {/* Time column */}
                <div className="sticky left-0 z-10 w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="h-12 border-b border-gray-200 dark:border-gray-700 p-2 text-xs font-medium text-gray-500 dark:text-gray-400">Time</div>
                  {timeSlots.map((timeSlot) => (
                    <div key={timeSlot} className="h-16 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {formatTimeString(timeSlot, prefs)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="w-40 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
                    <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 text-center">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{format(day, 'EEE')}</div>
                      <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    {timeSlots.map((timeSlot) => {
                      const shiftsForSlot = shifts.filter((shift) => {
                        const shiftStart = new Date(shift.startTime);
                        const shiftEnd = new Date(shift.endTime);
                        const slotTime = new Date(day);
                        const [hours, minutes] = timeSlot.split(':').map(Number);
                        slotTime.setHours(hours, minutes, 0, 0);

                        return isSameDay(shiftStart, day) &&
                          shiftStart.getTime() <= slotTime.getTime() &&
                          shiftEnd.getTime() > slotTime.getTime();
                      });

                      return (
                        <div
                          key={`${day.toISOString()}-${timeSlot}`}
                          className="h-16 border-b border-gray-200 dark:border-gray-700 p-1 overflow-y-auto"
                        >
                          {shiftsForSlot.map((shift) => (
                            <div
                              key={shift.id}
                              className="mb-1 rounded bg-blue-100 p-1 text-[10px]"
                            >
                              <div className="font-medium text-blue-900 truncate">
                                {shift.resource.name}
                              </div>
                              <div className="text-blue-700">
                                {formatTime(new Date(shift.startTime), prefs)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Legend</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center">
              <div className="h-4 w-4 rounded bg-blue-100"></div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Your shift</span>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-4 rounded bg-green-100"></div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Booked slot</span>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800"></div>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Available slot</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Quick Actions</h3>
          <div className="mt-4 space-y-3">
            <a
              href="/professional/shifts/create"
              className="block rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create New Shift
            </a>
            <a
              href="/professional/shifts"
              className="block rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              View All Shifts
            </a>
            <a
              href="/professional/bookings"
              className="block rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              View Bookings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}