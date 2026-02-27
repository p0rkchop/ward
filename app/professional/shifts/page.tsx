import { getServerSession } from '@/app/lib/auth';
import { getProfessionalShifts, cancelShift } from '@/app/lib/shift-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import ShiftsTable from '../components/ShiftsTable';

export const dynamic = 'force-dynamic';

export default async function ProfessionalShifts() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  let shifts: Awaited<ReturnType<typeof getProfessionalShifts>> = [];
  try {
    shifts = await getProfessionalShifts(professionalId);
  } catch (error) {
    console.error('Error fetching shifts:', error);
  }

  // Separate shifts into upcoming and past
  const now = new Date();
  const upcomingShifts = shifts.filter(shift => new Date(shift.startTime) >= now);
  const pastShifts = shifts.filter(shift => new Date(shift.startTime) < now);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">My Shifts</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your shifts and view past shifts.
            </p>
          </div>
          <a
            href="/professional/shifts/create"
            className="rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Create New Shift
          </a>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Shifts</h2>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {upcomingShifts.length} shift{upcomingShifts.length !== 1 ? 's' : ''}
          </span>
        </div>
        {upcomingShifts.length > 0 ? (
          <ShiftsTable shifts={upcomingShifts} professionalId={professionalId} />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <div className="mx-auto max-w-md">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No upcoming shifts</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Create your first shift to start accepting bookings from clients.
              </p>
              <div className="mt-6">
                <a
                  href="/professional/shifts/create"
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Create Shift
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {pastShifts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Past Shifts</h2>
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {pastShifts.length} shift{pastShifts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ShiftsTable shifts={pastShifts} professionalId={professionalId} isPast />
        </div>
      )}
    </div>
  );
}