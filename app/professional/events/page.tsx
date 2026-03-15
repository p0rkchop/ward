'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getJoinableEvents, joinEvent } from '@/app/lib/event-actions';
import { formatDateWithDay, prefsFromSession } from '@/app/lib/format-utils';

type JoinableEvent = Awaited<ReturnType<typeof getJoinableEvents>>[number];

export default function ProfessionalEventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const prefs = prefsFromSession(session?.user);
  const [events, setEvents] = useState<JoinableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getJoinableEvents();
        setEvents(data);
      } catch {
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleJoin = async (eventId: string) => {
    if (!password.trim()) {
      setError('Please enter the event password');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await joinEvent(eventId, password);
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(`Successfully joined "${result.eventName}"!`);
        setJoiningEventId(null);
        setPassword('');
        setTimeout(() => {
          router.push('/professional/dashboard');
          router.refresh();
        }, 2000);
      }
    } catch {
      setError('Failed to join event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Events</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Browse available events and join with an event password from your administrator.
        </p>
      </div>

      {success && (
        <div className="mb-6 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No upcoming events</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There are no active events available to join at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.name}</h3>
                  {event.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {formatDateWithDay(new Date(event.startDate), prefs)} &ndash; {formatDateWithDay(new Date(event.endDate), prefs)}
                    </span>
                    <span>
                      {event.defaultStartTime} &ndash; {event.defaultEndTime}
                    </span>
                    <span>
                      {event._count.professionals} professional{event._count.professionals !== 1 ? 's' : ''} joined
                    </span>
                  </div>
                </div>
                {joiningEventId !== event.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setJoiningEventId(event.id);
                      setPassword('');
                      setError(null);
                    }}
                    className="ml-4 flex-shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Join
                  </button>
                )}
              </div>

              {joiningEventId === event.id && (
                <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-800 p-4">
                  <label htmlFor={`password-${event.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Event Password
                  </label>
                  <div className="flex gap-3">
                    <input
                      id={`password-${event.id}`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJoin(event.id);
                      }}
                      placeholder="Enter the event password"
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleJoin(event.id)}
                      disabled={submitting}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Joining...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJoiningEventId(null);
                        setPassword('');
                        setError(null);
                      }}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Get the event password from your administrator.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
