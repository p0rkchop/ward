'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createShift } from '@/app/lib/shift-actions';
import { roundToNearest30Minutes, isValid30MinuteInterval, isAlignedTo30MinuteBoundary } from '@/app/lib/timeslot-utils';
import { useSession } from 'next-auth/react';
import { formatDateWithDay, formatTimeString, prefsFromSession } from '@/app/lib/format-utils';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  quantity: number;
  professionalsPerUnit: number;
  isActive: boolean;
}

interface EventDayInfo {
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

interface CreateShiftFormProps {
  professionalId: string;
  resources: Resource[];
  eventDays?: EventDayInfo[];
}

export default function CreateShiftForm({ professionalId, resources, eventDays = [] }: CreateShiftFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Time references for filtering past dates/times (use local time, not UTC)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const futureEventDays = eventDays.filter((d) => d.date >= todayStr);

  // Form state
  const [resourceId, setResourceId] = useState(resources.length > 0 ? resources[0].id : '');
  const firstFutureDay = futureEventDays[0] || eventDays[0];
  const [date, setDate] = useState(firstFutureDay?.date || '');
  const [startTime, setStartTime] = useState(firstFutureDay?.startTime || '09:00');
  const [duration, setDuration] = useState(30); // minutes

  // Available time options (30-minute intervals)
  // Filter to event hours for the selected date, and filter out past times for today
  const selectedEventDay = futureEventDays.find((d) => d.date === date) || eventDays.find((d) => d.date === date);

  const allTimeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const isToday = date === todayStr;

  const timeOptions = selectedEventDay
    ? allTimeOptions.filter((time) => {
        if (time < selectedEventDay.startTime || time >= selectedEventDay.endTime) return false;
        if (isToday && time <= currentTimeStr) return false;
        return true;
      })
    : allTimeOptions;

  // Available dates: only future event dates
  const availableDates = futureEventDays.map((d) => d.date);

  // Duration options (30-minute increments, capped to not exceed event day end time)
  const allDurationOptions = Array.from({ length: 16 }, (_, i) => (i + 1) * 30); // 30 to 480 minutes
  const durationOptions = selectedEventDay
    ? (() => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = selectedEventDay.endTime.split(':').map(Number);
        const maxMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        return allDurationOptions.filter((d) => d <= maxMinutes);
      })()
    : allDurationOptions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !date || !startTime) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Combine date and time in local timezone (no Z suffix)
      const startDate = new Date(`${date}T${startTime}:00`);

      // Round to nearest 30-minute boundary
      const roundedStart = roundToNearest30Minutes(startDate);

      // Calculate end time
      const endDate = new Date(roundedStart);
      endDate.setMinutes(endDate.getMinutes() + duration);

      // Validate locally before submitting
      if (!isAlignedTo30MinuteBoundary(roundedStart)) {
        setError('Start time must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)');
        return;
      }

      if (!isValid30MinuteInterval(roundedStart, endDate)) {
        setError('Duration must be a multiple of 30 minutes');
        return;
      }

      // Call server action (professionalId extracted from session)
      const result = await createShift(resourceId, roundedStart, endDate);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/professional/shifts');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to create shift');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Success!</h3>
            <div className="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>Shift created successfully. Redirecting to shifts page...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventDays.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Create New Shift</h1>
        </div>
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Event Assigned</h3>
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            You must be assigned to an active event with upcoming dates before you can create shifts.
          </p>
          <a
            href="/professional/events"
            className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
          >
            Browse &amp; Join Events
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Create New Shift</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create a shift to make yourself available for client bookings.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div>
          <label htmlFor="resource" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Resource *
          </label>
          <select
            id="resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={resources.length === 0}
          >
            {resources.length === 0 ? (
              <option value="">No active resources available</option>
            ) : (
              resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}{resource.location ? ` (${resource.location})` : ''}{resource.description ? ` - ${resource.description}` : ''}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select the resource you will be using for this shift.
          </p>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date *
          </label>
          <select
            id="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              // Reset start time when date changes (event hours may differ)
              const newDay = eventDays.find((d) => d.date === e.target.value);
              if (newDay) {
                setStartTime(newDay.startTime);
              }
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {formatDateWithDay(new Date(d + 'T00:00:00'), prefs)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select from the available event dates.
          </p>
        </div>

        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Time *
          </label>
          <select
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {formatTimeString(time, prefs)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Start time must be on the hour or half-hour (e.g., 9:00, 9:30).
          </p>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Duration *
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {durationOptions.map((minutes) => {
              const hours = minutes / 60;
              return (
                <option key={minutes} value={minutes}>
                  {hours} hour{hours !== 1 ? 's' : ''} ({minutes} minutes)
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Shift duration must be a multiple of 30 minutes.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || resources.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-8 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Shift Creation Rules</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-700 dark:text-blue-300">
          <li>Shifts must be at least 30 minutes long</li>
          <li>Shifts must be in multiples of 30 minutes (30, 60, 90, etc.)</li>
          <li>Start times must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)</li>
          <li>Resource availability depends on its capacity (quantity × professionals per unit)</li>
          <li>You cannot create overlapping shifts for yourself (same time period)</li>
          <li>Shifts can only be created by users with the PROFESSIONAL role</li>
          <li>Shifts are restricted to your assigned event&apos;s dates and hours</li>
        </ul>
      </div>
    </div>
  );
}