'use client';

import { useState } from 'react';
import { type AgendaDayData } from '@/app/lib/admin-actions';
import { formatTimeRange, formatTimeString, prefsFromSession } from '@/app/lib/format-utils';
import { useSession } from 'next-auth/react';

interface Props {
  agenda: AgendaDayData[];
}

export default function AgendaView({ agenda }: Props) {
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    // Auto-expand today and the next upcoming day with shifts
    const today = new Date().toISOString().split('T')[0];
    const initial = new Set<string>();
    for (const day of agenda) {
      if (day.date >= today && day.shifts.length > 0) {
        initial.add(day.date);
        if (initial.size >= 2) break;
      }
    }
    // If nothing upcoming, expand the first day with shifts
    if (initial.size === 0) {
      const first = agenda.find((d) => d.shifts.length > 0);
      if (first) initial.add(first.date);
    }
    return initial;
  });

  function toggleDay(date: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function expandAll() {
    setExpandedDays(new Set(agenda.map((d) => d.date)));
  }

  function collapseAll() {
    setExpandedDays(new Set());
  }

  function formatDayLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={expandAll}
          className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Collapse All
        </button>
      </div>

      <div className="space-y-2">
        {agenda.map((day) => {
          const isExpanded = expandedDays.has(day.date);
          const totalBookings = day.shifts.reduce((s, sh) => s + sh.bookings.length, 0);

          return (
            <div
              key={day.date}
              className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden"
            >
              {/* Day header */}
              <button
                onClick={() => toggleDay(day.date)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg select-none">{isExpanded ? '▾' : '▸'}</span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDayLabel(day.date)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeString(day.startTime, prefs)} – {formatTimeString(day.endTime, prefs)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {!day.isActive && (
                    <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Inactive
                    </span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400">
                    {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                  {day.shifts.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No shifts scheduled for this day.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {day.shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="border border-gray-100 dark:border-gray-700 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {shift.professionalName}
                              </span>
                              <span className="text-gray-400 dark:text-gray-500 mx-2">·</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {shift.resourceName}
                                {shift.resourceLocation ? ` (${shift.resourceLocation})` : ''}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimeRange(new Date(shift.startTime), new Date(shift.endTime), prefs)}
                            </span>
                          </div>

                          {shift.bookings.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 ml-2 mt-1">
                              No bookings
                            </p>
                          ) : (
                            <div className="ml-4 mt-2 space-y-1">
                              {shift.bookings.map((booking) => (
                                <div
                                  key={booking.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${
                                        booking.status === 'CONFIRMED'
                                          ? 'bg-green-500'
                                          : 'bg-gray-400'
                                      }`}
                                    />
                                    <span className="text-gray-900 dark:text-gray-100">
                                      {booking.clientName}
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500">
                                      {booking.clientPhone}
                                    </span>
                                  </div>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {formatTimeRange(new Date(booking.startTime), new Date(booking.endTime), prefs)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
