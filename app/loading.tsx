export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-purple-100"></div>
            </div>
          </div>

          <h2 className="mt-8 text-2xl font-bold text-gray-900">Loading Ward Scheduler</h2>
          <p className="mt-2 text-gray-600">Preparing your scheduling experience...</p>

          <div className="mt-8 w-full max-w-xs mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Loading components</p>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            <div className="h-3 bg-gradient-to-r from-purple-100 to-purple-300 rounded animate-pulse delay-0"></div>
            <div className="h-3 bg-gradient-to-r from-purple-100 to-purple-300 rounded animate-pulse delay-150"></div>
            <div className="h-3 bg-gradient-to-r from-purple-100 to-purple-300 rounded animate-pulse delay-300"></div>
          </div>
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>This should only take a moment.</p>
          <p className="mt-1">If loading persists, check your internet connection.</p>
        </div>
      </div>
    </div>
  );
}