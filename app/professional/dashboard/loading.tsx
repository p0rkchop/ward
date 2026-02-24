export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="mt-2 h-5 w-96 bg-gray-100 rounded animate-pulse"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-16 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Shifts Skeleton */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-9 w-28 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-20 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings Skeleton */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-9 w-28 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-40 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}