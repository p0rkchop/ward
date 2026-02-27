'use client';

import { getProfessionalShifts, cancelShift } from '@/app/lib/shift-actions';
import { useSession } from 'next-auth/react';
import { formatDateShort, formatTimeRange, prefsFromSession } from '@/app/lib/format-utils';
import { useState } from 'react';

interface ShiftsTableProps {
  shifts: Awaited<ReturnType<typeof getProfessionalShifts>>;
  professionalId: string;
  isPast?: boolean;
}

export default function ShiftsTable({ shifts, professionalId, isPast = false }: ShiftsTableProps) {
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

  if (localShifts.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow">
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Resource
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Date & Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Duration
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Bookings
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              {!isPast && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {localShifts.map((shift) => {
              const startTime = new Date(shift.startTime);
              const endTime = new Date(shift.endTime);
              const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
              const hasBookings = shift.bookings.length > 0;
              const isCancellable = !isPast && !hasBookings;

              return (
                <tr key={shift.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{shift.resource.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{shift.resource.description || 'No description'}</div>
                      </div>
                      {!shift.resource.isActive && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateShort(startTime, prefsFromSession(session?.user))}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeRange(startTime, endTime, prefsFromSession(session?.user))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {durationHours} hour{durationHours !== 1 ? 's' : ''}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{shift.bookings.length} booking{shift.bookings.length !== 1 ? 's' : ''}</div>
                    {shift.bookings.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">View details in bookings</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {shift.deletedAt ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                        Cancelled
                      </span>
                    ) : startTime < new Date() ? (
                      <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Upcoming
                      </span>
                    )}
                  </td>
                  {!isPast && (
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {isCancellable ? (
                        <button
                          onClick={() => handleCancelShift(shift.id)}
                          disabled={cancellingShiftId === shift.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {cancellingShiftId === shift.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      ) : hasBookings ? (
                        <span className="text-gray-500 dark:text-gray-400">Has bookings</span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Cannot cancel</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}