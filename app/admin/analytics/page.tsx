import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getAdminStats, type AdminStats } from '@/app/lib/admin-actions';
import { formatDateTimeShort, prefsFromSession } from '@/app/lib/format-utils';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  let stats: AdminStats | null = null;
  try {
    stats = await getAdminStats();
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          System analytics and performance metrics.
        </p>
      </div>

      {stats ? (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">User Growth</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                +{stats.userCounts.total}
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Total registered users</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Booking Rate</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.bookingCounts.total}
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Total bookings</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilization</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.shiftCounts.total > 0
                  ? Math.round((stats.bookingCounts.confirmed / stats.shiftCounts.total) * 100)
                  : 0}%
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Shift utilization</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Resources</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.resourceCounts.active}/{stats.resourceCounts.total}
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Active vs total</div>
            </div>
          </div>

          {/* Role Distribution */}
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Role Distribution</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Admins</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stats.userCounts.admins}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{
                      width: `${(stats.userCounts.admins / stats.userCounts.total) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Professionals</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stats.userCounts.professionals}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${(stats.userCounts.professionals / stats.userCounts.total) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Clients</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stats.userCounts.clients}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${(stats.userCounts.clients / stats.userCounts.total) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Booking Status */}
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Booking Status</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Confirmed</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stats.bookingCounts.confirmed}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${(stats.bookingCounts.confirmed / stats.bookingCounts.total) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cancelled</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {stats.bookingCounts.cancelled}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-red-600"
                    style={{
                      width: `${(stats.bookingCounts.cancelled / stats.bookingCounts.total) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <div className="mt-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {stats.recentActivity.slice(0, 5).map((activity, idx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {idx !== stats.recentActivity.length - 1 && (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-start space-x-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            activity.type === 'BOOKING'
                              ? 'bg-green-100'
                              : activity.type === 'SHIFT'
                              ? 'bg-blue-100'
                              : 'bg-purple-100'
                          }`}>
                            <span className={`text-xs font-semibold ${
                              activity.type === 'BOOKING'
                                ? 'text-green-600'
                                : activity.type === 'SHIFT'
                                ? 'text-blue-600'
                                : 'text-purple-600'
                            }`}>
                              {activity.type.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div>
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {activity.description}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formatDateTimeShort(new Date(activity.timestamp), prefsFromSession(session.user))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
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
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Unable to load analytics</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            There was an error loading the analytics data.
          </p>
        </div>
      )}
    </div>
  );
}