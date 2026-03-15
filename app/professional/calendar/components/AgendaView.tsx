'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDateFull, formatTime, formatTimeRange, prefsFromSession } from '@/app/lib/format-utils';

interface AgendaBooking {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string | null;
  resourceName: string;
  resourceDescription: string | null;
  professionalName: string | null;
  professionalId: string;
  shiftId: string;
  isOwnShift: boolean;
  hasBookings: boolean;
}

interface AgendaViewProps {
  myBookings: AgendaBooking[];
  emptyShifts: AgendaBooking[];
  otherBookings: AgendaBooking[];
  professionalId: string;
}

export default function AgendaView({ myBookings, emptyShifts, otherBookings, professionalId }: AgendaViewProps) {
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [showEmptyShifts, setShowEmptyShifts] = useState(false);
  const [showOtherProfessionals, setShowOtherProfessionals] = useState(false);

  // Build combined list based on filters
  const items: AgendaBooking[] = [
    ...myBookings,
    ...(showEmptyShifts ? emptyShifts : []),
    ...(showOtherProfessionals ? otherBookings : []),
  ];

  // Sort by start time
  items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Group by day
  const byDay: Record<string, AgendaBooking[]> = {};
  for (const item of items) {
    const key = new Date(item.startTime).toDateString();
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(item);
  }

  const days = Object.keys(byDay).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div>
      {/* Filter toggles */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowEmptyShifts(!showEmptyShifts)}
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            showEmptyShifts
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Empty shifts
        </button>
        <button
          type="button"
          onClick={() => setShowOtherProfessionals(!showOtherProfessionals)}
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            showOtherProfessionals
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Other professionals
        </button>
      </div>

      {/* Agenda list */}
      {days.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No upcoming appointments</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {showEmptyShifts
              ? "You don't have any upcoming shifts or appointments."
              : "You don't have any upcoming appointments. Toggle \"Empty shifts\" to see your full schedule."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((dayStr) => {
            const day = new Date(dayStr);
            const dayItems = byDay[dayStr];
            const isToday = new Date().toDateString() === dayStr;

            return (
              <div key={dayStr}>
                <h3 className="mb-3 flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDateFull(day, prefs)}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Today
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {dayItems.map((item) => {
                    const start = new Date(item.startTime);
                    const end = new Date(item.endTime);
                    const isEmptyShift = !item.hasBookings && item.isOwnShift;
                    const isOther = !item.isOwnShift;

                    return (
                      <a
                        key={`${item.shiftId}-${item.id}-${item.startTime}`}
                        href={item.hasBookings ? `/professional/bookings/${item.id}` : undefined}
                        className={`block rounded-lg border p-4 transition-colors ${
                          item.hasBookings
                            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm cursor-pointer'
                            : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Time */}
                            <div className="flex-shrink-0 w-28 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatTimeRange(start, end, prefs)}
                            </div>
                            {/* Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {item.hasBookings ? item.clientName ?? 'Client' : 'No bookings'}
                                </span>
                                {isEmptyShift && (
                                  <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                    Open
                                  </span>
                                )}
                                {isOther && (
                                  <span className="inline-flex rounded-full bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                                    {item.professionalName}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.resourceName}
                                {item.resourceDescription && ` — ${item.resourceDescription}`}
                              </div>
                            </div>
                          </div>
                          {/* Arrow for clickable items */}
                          {item.hasBookings && (
                            <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
