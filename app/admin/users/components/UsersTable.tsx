'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole, deleteUser, type UserWithRelations } from '@/app/lib/admin-actions';
import { Role } from '@/app/generated/prisma/enums';

type SortColumn = 'name' | 'phone' | 'role' | 'setup' | 'created' | 'shifts' | 'bookings';
type SortDirection = 'asc' | 'desc';

interface UsersTableProps {
  initialUsers: UserWithRelations[];
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithRelations[]>(initialUsers);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort & filter state
  const [filterText, setFilterText] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="ml-1 inline h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="ml-1 inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="ml-1 inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Text filter
    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.phoneNumber.toLowerCase().includes(lower) ||
        (u.email && u.email.toLowerCase().includes(lower))
      );
    }

    // Role filter
    if (filterRole !== 'ALL') {
      result = result.filter(u => u.role === filterRole);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'phone':
          cmp = a.phoneNumber.localeCompare(b.phoneNumber);
          break;
        case 'role':
          cmp = a.role.localeCompare(b.role);
          break;
        case 'setup':
          cmp = Number(a.setupComplete) - Number(b.setupComplete);
          break;
        case 'created':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'shifts':
          cmp = a.shiftsAsProfessional.length - b.shiftsAsProfessional.length;
          break;
        case 'bookings':
          cmp = a.bookingsAsClient.length - b.bookingsAsClient.length;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, filterText, filterRole, sortColumn, sortDirection]);

  const handleEditRole = (user: UserWithRelations) => {
    setEditingRoleId(user.id);
    setSelectedRole(user.role);
  };

  const handleCancelEdit = () => {
    setEditingRoleId(null);
    setSelectedRole(null);
  };

  const handleSaveRole = async (userId: string) => {
    if (!selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      await updateUserRole(userId, selectedRole);

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: selectedRole } : user
      ));
      setEditingRoleId(null);
      setSelectedRole(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user: UserWithRelations | undefined = users.find(u => u.id === userId);
    if (!user) return;

    const shiftCount = user.shiftsAsProfessional.length;
    const bookingCount = user.bookingsAsClient.length;

    const message = `Are you sure you want to delete ${user.name}? This will soft-delete their account.`;
    const details = shiftCount > 0 || bookingCount > 0
      ? `\n\nNote: This user has ${shiftCount} shift(s) and ${bookingCount} booking(s).`
      : '';

    if (!confirm(message + details)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case Role.PROFESSIONAL:
        return 'bg-blue-100 text-blue-800';
      case Role.CLIENT:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplay = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'Admin';
      case Role.PROFESSIONAL:
        return 'Professional';
      case Role.CLIENT:
        return 'Client';
      default:
        return role;
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <p className="mt-1 text-sm text-gray-600">
          Showing {filteredAndSortedUsers.length} of {users.length} users
        </p>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as Role | 'ALL')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value={Role.ADMIN}>Admin</option>
            <option value={Role.PROFESSIONAL}>Professional</option>
            <option value={Role.CLIENT}>Client</option>
          </select>
        </div>
        {(filterText || filterRole !== 'ALL') && (
          <button
            onClick={() => { setFilterText(''); setFilterRole('ALL'); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon column="name" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('phone')}
              >
                Contact <SortIcon column="phone" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('role')}
              >
                Role <SortIcon column="role" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('setup')}
              >
                Setup <SortIcon column="setup" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('created')}
              >
                Created <SortIcon column="created" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                onClick={() => handleSort('shifts')}
              >
                Activity <SortIcon column="shifts" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedUsers.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{user.phoneNumber}</div>
                  {user.email && (
                    <div className="text-xs text-gray-500">{user.email}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {editingRoleId === user.id ? (
                    <div className="space-y-2">
                      <select
                        value={selectedRole || ''}
                        onChange={(e) => setSelectedRole(e.target.value as Role)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                      >
                        <option value={Role.ADMIN}>Admin</option>
                        <option value={Role.PROFESSIONAL}>Professional</option>
                        <option value={Role.CLIENT}>Client</option>
                      </select>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSaveRole(user.id)}
                          disabled={loading}
                          className="text-sm text-green-600 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}>
                      {getRoleDisplay(user.role)}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.setupComplete
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {user.setupComplete ? 'Complete' : 'Pending'}
                  </span>
                  {user.event && (
                    <div className="text-xs text-gray-500 mt-0.5">{user.event.name}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  <div>
                    <div>Shifts: {user.shiftsAsProfessional.length}</div>
                    <div>Bookings: {user.bookingsAsClient.length}</div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  {editingRoleId === user.id ? null : (
                    <div className="space-x-3">
                      <button
                        onClick={() => handleEditRole(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Change Role
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
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

      {users.length === 0 && (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
          <p className="mt-2 text-gray-500">
            Users will appear here once they sign up.
          </p>
        </div>
      )}
    </div>
  );
}