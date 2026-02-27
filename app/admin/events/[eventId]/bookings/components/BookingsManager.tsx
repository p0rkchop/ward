'use client';

import { useState } from 'react';
import {
  type EventBookingData,
  getEventAvailableShifts,
  reassignBooking,
  adminRemoveBooking,
} from '@/app/lib/admin-actions';
import { formatDate, formatTimeRange, prefsFromSession } from '@/app/lib/format-utils';
import { useSession } from 'next-auth/react';

interface Props {
  eventId: string;
  initialBookings: EventBookingData[];
}

type AvailableShift = {
  id: string;
  professionalId: string;
  professionalName: string;
  resourceName: string;
  resourceLocation: string | null;
  startTime: Date;
  endTime: Date;
};

export default function BookingsManager({ eventId, initialBookings }: Props) {
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [bookings, setBookings] = useState(initialBookings);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  async function handleStartReassign(booking: EventBookingData) {
    setError('');
    setReassigningId(booking.id);
    setShiftsLoading(true);

    try {
      const shifts = await getEventAvailableShifts(
        eventId,
        new Date(booking.startTime),
        new Date(booking.endTime)
      );
      setAvailableShifts(shifts);
    } catch {
      setError('Failed to load available shifts');
    }
    setShiftsLoading(false);
  }

  async function handleReassign(bookingId: string, newShiftId: string) {
    setError('');
    setLoading(true);

    const result = await reassignBooking(bookingId, newShiftId);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Update local state — find the target shift info to update the booking
    const targetShift = availableShifts.find((s) => s.id === newShiftId);
    if (targetShift) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                shiftId: newShiftId,
                professionalId: targetShift.professionalId,
                professionalName: targetShift.professionalName,
                resourceName: targetShift.resourceName,
                resourceLocation: targetShift.resourceLocation,
              }
            : b
        )
      );
    }

    setReassigningId(null);
    setAvailableShifts([]);
    setSuccess('Booking reassigned successfully');
    setTimeout(() => setSuccess(''), 5000);
    setLoading(false);
  }

  async function handleRemove(bookingId: string, clientName: string) {
    if (!confirm(`Remove ${clientName}'s booking? This will cancel their appointment.`)) return;

    setError('');
    setLoading(true);

    const result = await adminRemoveBooking(bookingId);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    setSuccess('Booking removed');
    setTimeout(() => setSuccess(''), 5000);
    setLoading(false);
  }

  const filtered = bookings.filter((b) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      b.clientName.toLowerCase().includes(q) ||
      b.professionalName.toLowerCase().includes(q) ||
      b.resourceName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm">
          {success}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by client, professional, or resource..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No bookings found</p>
          <p className="text-sm mt-1">
            {bookings.length === 0
              ? 'No client bookings exist for this event yet.'
              : 'No bookings match your filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Professional
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date &amp; Time
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{booking.clientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{booking.clientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {booking.professionalName}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{booking.resourceName}</p>
                    {booking.resourceLocation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.resourceLocation}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>{formatDate(new Date(booking.startTime), prefs)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeRange(new Date(booking.startTime), new Date(booking.endTime), prefs)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {reassigningId === booking.id ? (
                      <div className="text-left">
                        {shiftsLoading ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Loading shifts...</p>
                        ) : availableShifts.length === 0 ? (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              No other shifts available for this timeslot.
                            </p>
                            <button
                              onClick={() => { setReassigningId(null); setAvailableShifts([]); }}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Reassign to:
                            </p>
                            {availableShifts.map((shift) => (
                              <button
                                key={shift.id}
                                disabled={loading}
                                onClick={() => handleReassign(booking.id, shift.id)}
                                className="block w-full text-left px-2 py-1 text-xs rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 disabled:opacity-50"
                              >
                                {shift.professionalName} — {shift.resourceName}
                                {shift.resourceLocation ? ` (${shift.resourceLocation})` : ''}
                              </button>
                            ))}
                            <button
                              onClick={() => { setReassigningId(null); setAvailableShifts([]); }}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:underline mt-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartReassign(booking)}
                          disabled={loading}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium disabled:opacity-50"
                        >
                          Reassign
                        </button>
                        <button
                          onClick={() => handleRemove(booking.id, booking.clientName)}
                          disabled={loading}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
