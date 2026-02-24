'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createShift } from '@/app/lib/shift-actions';
import { roundToNearest30Minutes, isValid30MinuteInterval, isAlignedTo30MinuteBoundary } from '@/app/lib/timeslot-utils';
import { ValidationError, ConflictError, BusinessRuleError } from '@/app/lib/errors';
import { format } from 'date-fns';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface CreateShiftFormProps {
  professionalId: string;
  resources: Resource[];
}

export default function CreateShiftForm({ professionalId, resources }: CreateShiftFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [resourceId, setResourceId] = useState(resources.length > 0 ? resources[0].id : '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(30); // minutes

  // Available time options (30-minute intervals)
  const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Duration options (30-minute increments up to 8 hours)
  const durationOptions = Array.from({ length: 16 }, (_, i) => (i + 1) * 30); // 30 to 480 minutes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !date || !startTime) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);

      // Round to nearest 30-minute boundary
      const roundedStart = roundToNearest30Minutes(startDate);

      // Calculate end time
      const endDate = new Date(roundedStart);
      endDate.setMinutes(endDate.getMinutes() + duration);

      // Validate locally before submitting
      if (!isAlignedTo30MinuteBoundary(roundedStart)) {
        throw new ValidationError('Start time must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)');
      }

      if (!isValid30MinuteInterval(roundedStart, endDate)) {
        throw new ValidationError('Duration must be a multiple of 30 minutes');
      }

      // Call server action (professionalId extracted from session)
      await createShift(resourceId, roundedStart, endDate);

      setSuccess(true);
      setTimeout(() => {
        router.push('/professional/shifts');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to create shift:', error);
      if (error instanceof ValidationError) {
        setError(error.message);
      } else if (error instanceof ConflictError) {
        setError(`Conflict: ${error.message}`);
      } else if (error instanceof BusinessRuleError) {
        setError(`Business rule violation: ${error.message}`);
      } else {
        setError(error.message || 'Failed to create shift');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Success!</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Shift created successfully. Redirecting to shifts page...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Shift</h1>
        <p className="mt-2 text-gray-600">
          Create a shift to make yourself available for client bookings.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
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

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="resource" className="block text-sm font-medium text-gray-700">
            Resource *
          </label>
          <select
            id="resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={resources.length === 0}
          >
            {resources.length === 0 ? (
              <option value="">No active resources available</option>
            ) : (
              resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} {resource.description ? `- ${resource.description}` : ''}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Select the resource you will be using for this shift.
          </p>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date *
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Select the date for your shift.
          </p>
        </div>

        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
            Start Time *
          </label>
          <select
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Start time must be on the hour or half-hour (e.g., 9:00, 9:30).
          </p>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
            Duration *
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <p className="mt-1 text-sm text-gray-500">
            Shift duration must be a multiple of 30 minutes.
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

      <div className="mt-8 rounded-md bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-800">Shift Creation Rules</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-700">
          <li>Shifts must be at least 30 minutes long</li>
          <li>Shifts must be in multiples of 30 minutes (30, 60, 90, etc.)</li>
          <li>Start times must be aligned to 30-minute boundaries (e.g., 9:00, 9:30)</li>
          <li>You cannot create overlapping shifts for the same resource</li>
          <li>You cannot create overlapping shifts for yourself (same time period)</li>
          <li>Shifts can only be created by users with the PROFESSIONAL role</li>
        </ul>
      </div>
    </div>
  );
}