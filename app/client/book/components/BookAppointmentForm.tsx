'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDateFull, formatTime, formatTimeRange, formatDateWithDay, prefsFromSession } from '@/app/lib/format-utils';
import { bookTimeslot, rescheduleBooking, getClientEventBookingStatus, type ClientEventBookingStatus } from '@/app/lib/booking-actions';

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
  rescheduleBookingId?: string;
  bookingStatus?: ClientEventBookingStatus[];
}

export default function BookAppointmentForm({ clientId, slotsByDay, rescheduleBookingId, bookingStatus = [] }: BookAppointmentFormProps) {
  const isReschedule = !!rescheduleBookingId;
  const router = useRouter();
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const days = Object.keys(slotsByDay).sort();

  // Live booking status — always fetched fresh before showing overlay
  const [liveBookingStatus, setLiveBookingStatus] = useState<ClientEventBookingStatus[] | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const refreshBookingStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const fresh = await getClientEventBookingStatus();
      setLiveBookingStatus(fresh);
    } catch {
      // On error, don't block — allow booking
      setLiveBookingStatus([]);
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  // Always fetch fresh status on mount — never rely on server-rendered data alone
  useEffect(() => {
    refreshBookingStatus();
  }, [refreshBookingStatus]);

  // Check if the client has reached booking limits (skip in reschedule mode, skip while loading)
  const limitReachedEvents = isReschedule || !liveBookingStatus
    ? []
    : liveBookingStatus.filter((s) => s.hasReachedLimit);
  const isBookingBlocked = limitReachedEvents.length > 0 && days.length > 0;

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
      if (rescheduleBookingId) {
        await rescheduleBooking(rescheduleBookingId, selectedSlot.start, selectedSlot.end, notes || undefined);
      } else {
        await bookTimeslot(clientId, selectedSlot.start, selectedSlot.end, notes || undefined);
      }
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
        <h3 className="mt-4 text-lg font-medium text-green-800">
          {isReschedule ? 'Appointment Rescheduled!' : 'Appointment Booked Successfully!'}
        </h3>
        <p className="mt-2 text-green-700">
          {isReschedule
            ? 'Your appointment has been rescheduled. Redirecting to your appointments...'
            : 'Your appointment has been confirmed. Redirecting to your appointments...'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {isReschedule ? 'Reschedule Appointment' : 'Available Time Slots'}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {isReschedule
            ? 'Select a new time slot. Your current booking will be cancelled and replaced.'
            : 'Select a 30-minute time slot for your appointment.'}
        </p>
      </div>

      {isBookingBlocked ? (
        <div className="relative">
          {/* Greyed-out slots behind overlay */}
          <div className="opacity-30 pointer-events-none select-none">
            <div className="space-y-6">
              {days.slice(0, 2).map((dayStr) => {
                const day = new Date(dayStr);
                const daySlots = slotsByDay[dayStr];
                return (
                  <div key={dayStr} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatDateFull(day, prefs)}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {daySlots.slice(0, 8).map((slot) => (
                        <div
                          key={slot.start.toISOString()}
                          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 text-center"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatTime(slot.start, prefs)}</div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{slot.availableCapacity} available</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-8 max-w-md text-center">
              <svg className="mx-auto h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Booking Limit Reached
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {limitReachedEvents.length === 1 && !limitReachedEvents[0].allowMultiBooking
                  ? `You already have an appointment booked for ${limitReachedEvents[0].eventName}. Only one booking is allowed per event.`
                  : `You've reached the maximum number of bookings allowed.`}
              </p>
              {limitReachedEvents[0]?.existingBookingId && (
                <div className="mt-6 flex flex-col gap-3">
                  <a
                    href={`/client/book?reschedule=${limitReachedEvents[0].existingBookingId}`}
                    className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Reschedule Appointment
                  </a>
                  <a
                    href="/client/appointments"
                    className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    View My Appointments
                  </a>
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={refreshBookingStatus}
                  disabled={checkingStatus}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  {checkingStatus ? 'Checking...' : 'Check again'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : days.length === 0 ? (
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

              <div className="mt-4">
                <label htmlFor="booking-notes" className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Notes for your professional <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  id="booking-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 250))}
                  maxLength={250}
                  rows={2}
                  placeholder="Any details your professional should know..."
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-green-500"
                />
                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">
                  {notes.length}/250
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={loading}
                  className="w-full rounded-md bg-green-600 px-4 py-3 text-center text-lg font-semibold text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (isReschedule ? 'Rescheduling...' : 'Booking...') : (isReschedule ? 'Reschedule Appointment' : 'Book Appointment')}
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