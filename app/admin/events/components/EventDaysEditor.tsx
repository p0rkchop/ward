'use client';

import { useState } from 'react';
import {
  getEventDays,
  updateEventDay,
  createBlackout,
  deleteBlackout,
  type EventDayWithBlackouts,
} from '@/app/lib/event-actions';

interface Props {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

export default function EventDaysEditor({ eventId, eventName, onClose }: Props) {
  const [days, setDays] = useState<EventDayWithBlackouts[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inline editing state
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Blackout creation state
  const [addingBlackoutDayId, setAddingBlackoutDayId] = useState<string | null>(null);
  const [newBlackoutStart, setNewBlackoutStart] = useState('');
  const [newBlackoutEnd, setNewBlackoutEnd] = useState('');
  const [newBlackoutDesc, setNewBlackoutDesc] = useState('');

  // Load days on mount
  if (!loaded) {
    setLoaded(true);
    setLoading(true);
    getEventDays(eventId)
      .then((result) => {
        setDays(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load days');
        setLoading(false);
      });
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function startEditDay(day: EventDayWithBlackouts) {
    setEditingDayId(day.id);
    setEditStart(day.startTime);
    setEditEnd(day.endTime);
    setError('');
  }

  async function saveDay(dayId: string) {
    setLoading(true);
    setError('');

    const result = await updateEventDay(dayId, {
      startTime: editStart,
      endTime: editEnd,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, startTime: editStart, endTime: editEnd } : d
      )
    );
    setEditingDayId(null);
    setLoading(false);
  }

  async function toggleDayActive(dayId: string, currentActive: boolean) {
    setLoading(true);
    setError('');

    const result = await updateEventDay(dayId, { isActive: !currentActive });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, isActive: !currentActive } : d))
    );
    setLoading(false);
  }

  async function handleAddBlackout(dayId: string) {
    setLoading(true);
    setError('');

    const result = await createBlackout({
      eventDayId: dayId,
      startTime: newBlackoutStart,
      endTime: newBlackoutEnd,
      description: newBlackoutDesc || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? {
              ...d,
              blackouts: [
                ...d.blackouts,
                {
                  id: result.id,
                  startTime: newBlackoutStart,
                  endTime: newBlackoutEnd,
                  description: newBlackoutDesc || null,
                },
              ],
            }
          : d
      )
    );
    setAddingBlackoutDayId(null);
    setNewBlackoutStart('');
    setNewBlackoutEnd('');
    setNewBlackoutDesc('');
    setLoading(false);
  }

  async function handleDeleteBlackout(dayId: string, blackoutId: string) {
    setLoading(true);
    setError('');

    const result = await deleteBlackout(blackoutId);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, blackouts: d.blackouts.filter((b) => b.id !== blackoutId) }
          : d
      )
    );
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Days</h2>
            <p className="text-sm text-gray-500">{eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && days.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Loading days…</div>
          ) : days.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No days found for this event.
            </div>
          ) : (
            <div className="space-y-3">
              {days.map((day) => (
                <div
                  key={day.id}
                  className={`rounded-lg border p-4 ${
                    day.isActive
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  {/* Day header row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[180px] font-medium text-gray-900">
                      {formatDate(day.date)}
                    </div>

                    {editingDayId === day.id ? (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Start</label>
                          <input
                            type="time"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">End</label>
                          <input
                            type="time"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                          />
                        </div>
                        <button
                          onClick={() => saveDay(day.id)}
                          disabled={loading}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDayId(null)}
                          className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-700">
                          {day.startTime} – {day.endTime}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            day.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {day.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <button
                            onClick={() => startEditDay(day)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Edit Times
                          </button>
                          <button
                            onClick={() => toggleDayActive(day.id, day.isActive)}
                            disabled={loading}
                            className={`text-xs font-medium ${
                              day.isActive
                                ? 'text-amber-600 hover:text-amber-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {day.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => {
                              setAddingBlackoutDayId(day.id);
                              setNewBlackoutStart('');
                              setNewBlackoutEnd('');
                              setNewBlackoutDesc('');
                            }}
                            className="text-xs font-medium text-purple-600 hover:text-purple-800"
                          >
                            + Blackout
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Blackouts section */}
                  {day.blackouts.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-2">
                      <p className="text-xs font-medium uppercase text-gray-400">Blackouts</p>
                      {day.blackouts.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 rounded-md bg-red-50 px-3 py-1.5"
                        >
                          <span className="text-sm font-medium text-red-700">
                            {b.startTime} – {b.endTime}
                          </span>
                          {b.description && (
                            <span className="text-sm text-red-600">{b.description}</span>
                          )}
                          <button
                            onClick={() => handleDeleteBlackout(day.id, b.id)}
                            disabled={loading}
                            className="ml-auto text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add blackout inline form */}
                  {addingBlackoutDayId === day.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <div>
                        <label className="block text-xs text-gray-500">Start</label>
                        <input
                          type="time"
                          value={newBlackoutStart}
                          onChange={(e) => setNewBlackoutStart(e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">End</label>
                        <input
                          type="time"
                          value={newBlackoutEnd}
                          onChange={(e) => setNewBlackoutEnd(e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Description</label>
                        <input
                          type="text"
                          value={newBlackoutDesc}
                          onChange={(e) => setNewBlackoutDesc(e.target.value)}
                          placeholder="e.g., Lunch break"
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                      </div>
                      <button
                        onClick={() => handleAddBlackout(day.id)}
                        disabled={loading || !newBlackoutStart || !newBlackoutEnd}
                        className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingBlackoutDayId(null)}
                        className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
