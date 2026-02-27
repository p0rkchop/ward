'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDateFull, formatTime, formatTimeRange, formatDateWithDay, prefsFromSession } from '@/app/lib/format-utils';
import { bookTimeslot } from '@/app/lib/booking-actions';

interface TimeSlot {
  start: Date;
  end: Date;
  shiftCount: number;
  bookingCount: number;
  availableCapacity: number;
  isAvailable: boolean;
}

interface BookAppointmentFormProps {
  clientId: string;
  slotsByDay: Record<string, TimeSlot[]>;
}

export default function BookAppointmentForm({ clientId, slotsByDay }: BookAppointmentFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const days = Object.keys(slotsByDay).sort();

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setError(null);
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await bookTimeslot(clientId, selectedSlot.start, selectedSlot.end);
      setSuccess(true);
      setTimeout(() => {
        router.push('/client/appointments');
      }, 2000);
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-green-800">Appointment Booked Successfully!</h3>
        <p className="mt-2 text-green-700">
          Your appointment has been confirmed. Redirecting to your appointments...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Available Time Slots</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Select a 30-minute time slot for your appointment.
        </p>
      </div>

      {days.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No available time slots</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There are no available appointments in the next 7 days. Please check back later.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {days.map((dayStr) => {
              const day = new Date(dayStr);
              const daySlots = slotsByDay[dayStr];

              return (
                <div key={dayStr} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {formatDateFull(day, prefs)}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {daySlots.map((slot) => {
                      const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                      const timeStr = formatTime(slot.start, prefs);

                      return (
                        <button
                          key={slot.start.toISOString()}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`rounded-lg border p-4 text-center transition-colors ${
                            isSelected
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-offset-2'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-green-300 hover:bg-green-50'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{timeStr}</div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {slot.availableCapacity} available
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedSlot && (
            <div className="mt-8 rounded-lg bg-blue-50 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selected Appointment</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDateWithDay(selectedSlot.start, prefs)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatTimeRange(selectedSlot.start, selectedSlot.end, prefs)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">30 minutes</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Availability</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedSlot.availableCapacity} slot{selectedSlot.availableCapacity !== 1 ? 's' : ''} left
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={loading}
                  className="w-full rounded-md bg-green-600 px-4 py-3 text-center text-lg font-semibold text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}