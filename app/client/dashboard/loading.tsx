export default function ClientDashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="mt-2 h-5 w-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-16 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Upcoming Appointments Skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-50 dark:bg-gray-800/50 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-50 dark:bg-gray-800/50 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
              <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}