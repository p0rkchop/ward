import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getAdminStats } from '@/app/lib/admin-actions';
import { formatDateTimeShort, prefsFromSession } from '@/app/lib/format-utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  let stats = null;
  try {
    stats = await getAdminStats();
  } catch (error) {
    console.error('Error fetching admin stats:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of system metrics and recent activity.
        </p>
      </div>

      {stats ? (
        <>
          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/users" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-full bg-purple-100 p-3">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.userCounts.total}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Admins: {stats.userCounts.admins}</div>
                <div className="text-gray-500 dark:text-gray-400">Professionals: {stats.userCounts.professionals}</div>
                <div className="text-gray-500 dark:text-gray-400">Clients: {stats.userCounts.clients}</div>
              </div>
            </Link>

            <Link href="/admin/resources" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-full bg-green-100 p-3">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Resources</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.resourceCounts.active}</p>
                </div>
              </div>
              <div className="mt-4 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Total Resources: {stats.resourceCounts.total}</div>
                <div className="text-gray-500 dark:text-gray-400">Inactive: {stats.resourceCounts.total - stats.resourceCounts.active}</div>
              </div>
            </Link>

            <Link href="/admin/analytics" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Shifts</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.shiftCounts.total}</p>
                </div>
              </div>
              <div className="mt-4 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Upcoming: {stats.shiftCounts.upcoming}</div>
                <div className="text-gray-500 dark:text-gray-400">Past: {stats.shiftCounts.total - stats.shiftCounts.upcoming}</div>
              </div>
            </Link>

            <Link href="/admin/analytics" className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow transition-shadow hover:shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-full bg-yellow-100 p-3">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.bookingCounts.total}</p>
                </div>
              </div>
              <div className="mt-4 text-sm">
                <div className="text-gray-500 dark:text-gray-400">Confirmed: {stats.bookingCounts.confirmed}</div>
                <div className="text-gray-500 dark:text-gray-400">Cancelled: {stats.bookingCounts.cancelled}</div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <div className="mt-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stats.recentActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {formatDateTimeShort(new Date(activity.timestamp), prefsFromSession(session.user))}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            activity.type === 'BOOKING'
                              ? 'bg-green-100 text-green-800'
                              : activity.type === 'SHIFT'
                              ? 'bg-blue-100 text-blue-800'
                              : activity.type === 'USER'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}>
                            {activity.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {activity.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Unable to load dashboard</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There was an error loading the dashboard data.
          </p>
        </div>
      )}
    </div>
  );
}