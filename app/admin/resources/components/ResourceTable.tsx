'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createResource, updateResource, deleteResource } from '@/app/lib/admin-actions';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  quantity: number;
  professionalsPerUnit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ResourceTableProps {
  initialResources: Resource[];
}

export default function ResourceTable({ initialResources }: ResourceTableProps) {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedResource, setEditedResource] = useState<Partial<Resource> | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newResource, setNewResource] = useState({ name: '', description: '', location: '', quantity: 1, professionalsPerUnit: 1, isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setEditedResource({ ...resource });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedResource(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editedResource) return;

    setLoading(true);
    setError(null);

    try {
      await updateResource(id, {
        name: editedResource.name,
        description: editedResource.description ?? undefined,
        location: editedResource.location ?? undefined,
        quantity: editedResource.quantity,
        professionalsPerUnit: editedResource.professionalsPerUnit,
        isActive: editedResource.isActive,
      });

      setResources(resources.map(resource =>
        resource.id === id ? { ...resource, ...editedResource } : resource
      ));
      setEditingId(null);
      setEditedResource(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error updating resource:', err);
      setError(err.message || 'Failed to update resource');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource? This will soft-delete it.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteResource(id);
      setResources(resources.filter(resource => resource.id !== id));
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      setError(err.message || 'Failed to delete resource');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newResource.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await createResource({
        name: newResource.name,
        description: newResource.description || undefined,
        location: newResource.location || undefined,
        quantity: newResource.quantity,
        professionalsPerUnit: newResource.professionalsPerUnit,
        isActive: newResource.isActive,
      });

      setResources([...resources, created]);
      setNewResource({ name: '', description: '', location: '', quantity: 1, professionalsPerUnit: 1, isActive: true });
      setShowCreateForm(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error creating resource:', err);
      setError(err.message || 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Resources</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
        >
          {showCreateForm ? 'Cancel' : 'Create Resource'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4">
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

      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Create New Resource</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder="e.g., Massage Table"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Active Status
              </label>
              <div className="mt-2 flex items-center">
                <input
                  type="checkbox"
                  checked={newResource.isActive}
                  onChange={(e) => setNewResource({ ...newResource, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={newResource.quantity}
                onChange={(e) => setNewResource({ ...newResource, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">How many of this resource do you have?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Professionals Per Unit
              </label>
              <input
                type="number"
                min={1}
                value={newResource.professionalsPerUnit}
                onChange={(e) => setNewResource({ ...newResource, professionalsPerUnit: Math.max(1, parseInt(e.target.value) || 1) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">How many professionals can be assigned to each unit?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={newResource.location}
                onChange={(e) => setNewResource({ ...newResource, location: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder="e.g., Room 101, Hall A"
              />
              <p className="mt-1 text-xs text-gray-500">Optional physical location of this resource</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder="Optional description of the resource"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Resource'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Pros/Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  {editingId === resource.id ? (
                    <input
                      type="text"
                      value={editedResource?.name || ''}
                      onChange={(e) => setEditedResource({ ...editedResource, name: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === resource.id ? (
                    <textarea
                      value={editedResource?.description || ''}
                      onChange={(e) => setEditedResource({ ...editedResource, description: e.target.value })}
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{resource.description || '-'}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === resource.id ? (
                    <input
                      type="text"
                      value={editedResource?.location || ''}
                      onChange={(e) => setEditedResource({ ...editedResource, location: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{resource.location || '-'}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {editingId === resource.id ? (
                    <input
                      type="number"
                      min={1}
                      value={editedResource?.quantity ?? 1}
                      onChange={(e) => setEditedResource({ ...editedResource, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="block w-20 rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{resource.quantity}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {editingId === resource.id ? (
                    <input
                      type="number"
                      min={1}
                      value={editedResource?.professionalsPerUnit ?? 1}
                      onChange={(e) => setEditedResource({ ...editedResource, professionalsPerUnit: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="block w-20 rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{resource.professionalsPerUnit}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {editingId === resource.id ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editedResource?.isActive ?? false}
                        onChange={(e) => setEditedResource({ ...editedResource, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {editedResource?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ) : (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      resource.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {resource.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(resource.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  {editingId === resource.id ? (
                    <div className="space-x-3">
                      <button
                        onClick={() => handleSaveEdit(resource.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-x-3">
                      <button
                        onClick={() => handleEdit(resource)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resources.length === 0 && (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No resources found</h3>
          <p className="mt-2 text-gray-500">
            Get started by creating your first resource.
          </p>
        </div>
      )}
    </div>
  );
}