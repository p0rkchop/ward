'use client';

import { cancelShift, getProfessionalShifts } from '@/app/lib/shift-actions';
import { useSession } from 'next-auth/react';
import { formatDateTimeRange, prefsFromSession } from '@/app/lib/format-utils';
import { useState } from 'react';

interface UpcomingShiftsProps {
  shifts: Awaited<ReturnType<typeof getProfessionalShifts>>;
  professionalId: string;
}

export default function UpcomingShifts({ shifts, professionalId }: UpcomingShiftsProps) {
  const { data: session } = useSession();
  const [cancellingShiftId, setCancellingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localShifts, setLocalShifts] = useState(shifts);

  const handleCancelShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to cancel this shift? This action cannot be undone.')) {
      return;
    }

    setCancellingShiftId(shiftId);
    setError(null);

    try {
      await cancelShift(shiftId);
      // Remove the cancelled shift from local state
      setLocalShifts(localShifts.filter(shift => shift.id !== shiftId));
    } catch (error: any) {
      console.error('Failed to cancel shift:', error);
      setError(error.message || 'Failed to cancel shift');
    } finally {
      setCancellingShiftId(null);
    }
  };

  // Filter to upcoming shifts (starting from now)
  const upcomingShifts = localShifts
    .filter(shift => new Date(shift.startTime) >= new Date())
    .slice(0, 5);

  if (upcomingShifts.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow">
        {error && (
          <div className="bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Upcoming Shifts</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No upcoming shifts in the next 7 days</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Create your first shift to start accepting bookings</p>
            <a
              href="/professional/shifts/create"
              className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create Shift
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow">
      {error && (
        <div className="bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Upcoming Shifts</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your next 5 shifts</p>
          </div>
          <a
            href="/professional/shifts"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all
          </a>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {upcomingShifts.map((shift) => {
            const startTime = new Date(shift.startTime);
            const endTime = new Date(shift.endTime);
            const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            const bookingCount = shift.bookings.length;

            return (
              <li key={shift.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {shift.resource.name}
                      </p>
                      {!shift.resource.isActive && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        {formatDateTimeRange(startTime, endTime, prefsFromSession(session?.user))}
                      </p>
                      <p className="mt-1">
                        {durationHours} hour{durationHours !== 1 ? 's' : ''} • {bookingCount} booking{bookingCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium leading-4 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      onClick={() => handleCancelShift(shift.id)}
                      disabled={bookingCount > 0 || cancellingShiftId === shift.id}
                    >
                      {bookingCount > 0 ? 'Has Bookings' : cancellingShiftId === shift.id ? 'Cancelling...' : 'Cancel'}
                    </button>
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