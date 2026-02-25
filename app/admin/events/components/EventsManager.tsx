'use client';

import { useState } from 'react';
import { createEvent, updateEvent, deleteEvent, type EventData } from '@/app/lib/event-actions';

interface Props {
  initialEvents: EventData[];
}

export default function EventsManager({ initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDefaultStartTime, setNewDefaultStartTime] = useState('09:00');
  const [newDefaultEndTime, setNewDefaultEndTime] = useState('17:00');
  const [newPassword, setNewPassword] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDefaultStartTime, setEditDefaultStartTime] = useState('09:00');
  const [editDefaultEndTime, setEditDefaultEndTime] = useState('17:00');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createEvent({
      name: newName,
      description: newDescription || null,
      startDate: newStartDate,
      endDate: newEndDate,
      defaultStartTime: newDefaultStartTime,
      defaultEndTime: newDefaultEndTime,
      professionalPassword: newPassword,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Refresh by adding to list
    const dayCount = Math.max(1, Math.ceil((new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    setEvents((prev) => [
      {
        id: result.id,
        name: newName.trim(),
        description: newDescription.trim() || null,
        startDate: new Date(newStartDate),
        endDate: new Date(newEndDate),
        defaultStartTime: newDefaultStartTime,
        defaultEndTime: newDefaultEndTime,
        professionalPassword: newPassword.trim(),
        isActive: true,
        adminId: '',
        createdAt: new Date(),
        _count: { professionals: 0, days: dayCount },
      },
      ...prev,
    ]);

    setNewName('');
    setNewDescription('');
    setNewStartDate('');
    setNewEndDate('');
    setNewDefaultStartTime('09:00');
    setNewDefaultEndTime('17:00');
    setNewPassword('');
    setShowCreate(false);
    setLoading(false);
  }

  function startEdit(event: EventData) {
    setEditingId(event.id);
    setEditName(event.name);
    setEditDescription(event.description || '');
    setEditStartDate(new Date(event.startDate).toISOString().split('T')[0]);
    setEditEndDate(new Date(event.endDate).toISOString().split('T')[0]);
    setEditDefaultStartTime(event.defaultStartTime || '09:00');
    setEditDefaultEndTime(event.defaultEndTime || '17:00');
    setEditPassword(event.professionalPassword);
    setEditActive(event.isActive);
    setError('');
  }

  async function handleUpdate(id: string) {
    setError('');
    setLoading(true);

    const result = await updateEvent(id, {
      name: editName,
      description: editDescription || null,
      startDate: editStartDate,
      endDate: editEndDate,
      defaultStartTime: editDefaultStartTime,
      defaultEndTime: editDefaultEndTime,
      professionalPassword: editPassword,
      isActive: editActive,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const dayCount = Math.max(1, Math.ceil((new Date(editEndDate).getTime() - new Date(editStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === id
          ? {
              ...ev,
              name: editName.trim(),
              description: editDescription.trim() || null,
              startDate: new Date(editStartDate),
              endDate: new Date(editEndDate),
              defaultStartTime: editDefaultStartTime,
              defaultEndTime: editDefaultEndTime,
              professionalPassword: editPassword.trim(),
              isActive: editActive,
              _count: { ...ev._count, professionals: ev._count?.professionals ?? 0, days: dayCount },
            }
          : ev
      )
    );

    setEditingId(null);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event? Professionals linked to it will be unlinked.')) return;

    setLoading(true);
    const result = await deleteEvent(id);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    setLoading(false);
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create Button / Form */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Create Event
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900">New Event</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password professionals will use to register"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Start Time</label>
              <input
                type="time"
                value={newDefaultStartTime}
                onChange={(e) => setNewDefaultStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Default open time for each day</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily End Time</label>
              <input
                type="time"
                value={newDefaultEndTime}
                onChange={(e) => setNewDefaultEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Default close time for each day</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No events yet</p>
          <p className="text-sm mt-1">
            Create an event to set up professional passwords for registration.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) =>
                editingId === event.id ? (
                  <tr key={event.id} className="bg-blue-50">
                    <td className="px-6 py-4" colSpan={8}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Password"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">Active</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Daily Start</label>
                            <input
                              type="time"
                              value={editDefaultStartTime}
                              onChange={(e) => setEditDefaultStartTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Daily End</label>
                            <input
                              type="time"
                              value={editDefaultEndTime}
                              onChange={(e) => setEditDefaultEndTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                          </div>
                        </div>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(event.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={event.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{event.name}</p>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(event.startDate)} — {formatDate(event.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                        {event.professionalPassword}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {event._count?.professionals ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {event._count?.days ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {event.defaultStartTime || '09:00'} – {event.defaultEndTime || '17:00'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {event.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(event)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
