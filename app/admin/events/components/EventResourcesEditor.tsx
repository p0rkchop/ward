'use client';

import { useState } from 'react';
import {
  getEventResources,
  getUnassignedResources,
  assignResourceToEvent,
  unassignResourceFromEvent,
  type EventResourceData,
} from '@/app/lib/event-actions';

interface UnassignedResource {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  quantity: number;
  professionalsPerUnit: number;
}

interface Props {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

export default function EventResourcesEditor({ eventId, eventName, onClose }: Props) {
  const [assigned, setAssigned] = useState<EventResourceData[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load data on mount
  if (!loaded) {
    setLoaded(true);
    setLoading(true);
    Promise.all([getEventResources(eventId), getUnassignedResources(eventId)])
      .then(([assignedRes, unassignedRes]) => {
        setAssigned(assignedRes);
        setUnassigned(unassignedRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load resources');
        setLoading(false);
      });
  }

  async function handleAssign(resourceId: string) {
    setLoading(true);
    setError('');

    const result = await assignResourceToEvent(eventId, resourceId);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Move resource from unassigned to assigned
    const resource = unassigned.find((r) => r.id === resourceId);
    if (resource) {
      setAssigned((prev) => [
        ...prev,
        {
          id: result.id,
          resourceId: resource.id,
          resourceName: resource.name,
          resourceDescription: resource.description,
          resourceLocation: resource.location,
          resourceQuantity: resource.quantity,
          resourceProfessionalsPerUnit: resource.professionalsPerUnit,
        },
      ]);
      setUnassigned((prev) => prev.filter((r) => r.id !== resourceId));
    }
    setLoading(false);
  }

  async function handleUnassign(eventResourceId: string, resourceId: string) {
    setLoading(true);
    setError('');

    const result = await unassignResourceFromEvent(eventResourceId);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Move resource from assigned back to unassigned
    const er = assigned.find((a) => a.id === eventResourceId);
    if (er) {
      setUnassigned((prev) =>
        [
          ...prev,
          {
            id: er.resourceId,
            name: er.resourceName,
            description: er.resourceDescription,
            location: er.resourceLocation,
            quantity: er.resourceQuantity,
            professionalsPerUnit: er.resourceProfessionalsPerUnit,
          },
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
      setAssigned((prev) => prev.filter((a) => a.id !== eventResourceId));
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative mx-4 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Resources</h2>
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

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && assigned.length === 0 && unassigned.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Loading resources…</div>
          ) : (
            <>
              {/* Assigned Resources */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                  Assigned Resources ({assigned.length})
                </h3>
                {assigned.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                    No resources assigned to this event yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assigned.map((er) => (
                      <div
                        key={er.id}
                        className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{er.resourceName}</p>
                          <div className="flex gap-3 text-xs text-gray-500">
                            {er.resourceLocation && <span>📍 {er.resourceLocation}</span>}
                            <span>Qty: {er.resourceQuantity}</span>
                            <span>Pros/Unit: {er.resourceProfessionalsPerUnit}</span>
                            <span className="font-medium text-green-700">
                              Capacity: {er.resourceQuantity * er.resourceProfessionalsPerUnit}
                            </span>
                          </div>
                          {er.resourceDescription && (
                            <p className="mt-0.5 text-xs text-gray-400">{er.resourceDescription}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnassign(er.id, er.resourceId)}
                          disabled={loading}
                          className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Resources */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                  Available Resources ({unassigned.length})
                </h3>
                {unassigned.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                    All active resources are assigned to this event.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unassigned.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <div className="flex gap-3 text-xs text-gray-500">
                            {r.location && <span>📍 {r.location}</span>}
                            <span>Qty: {r.quantity}</span>
                            <span>Pros/Unit: {r.professionalsPerUnit}</span>
                          </div>
                          {r.description && (
                            <p className="mt-0.5 text-xs text-gray-400">{r.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssign(r.id)}
                          disabled={loading}
                          className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
