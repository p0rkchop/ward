import { getServerSession } from '@/app/lib/auth';
import { getProfessionalShifts } from '@/app/lib/shift-actions';
import { getProfessionalBookings } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import StatsCard from '../components/StatsCard';
import UpcomingShifts from '../components/UpcomingShifts';
import RecentBookings from '../components/RecentBookings';

export const dynamic = 'force-dynamic';

type ShiftWithDetails = Awaited<ReturnType<typeof getProfessionalShifts>>[number];
type BookingWithDetails = Awaited<ReturnType<typeof getProfessionalBookings>>[number];

export default async function ProfessionalDashboard() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Get data for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  let shifts: ShiftWithDetails[] = [];
  let bookings: BookingWithDetails[] = [];
  let stats = {
    totalShifts: 0,
    upcomingShifts: 0,
    totalBookings: 0,
    todayBookings: 0,
  };

  try {
    shifts = await getProfessionalShifts(professionalId, startDate, endDate);
    bookings = await getProfessionalBookings(professionalId, startDate, endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    stats = {
      totalShifts: shifts.length,
      upcomingShifts: shifts.filter(s => s.startTime >= new Date()).length,
      totalBookings: bookings.length,
      todayBookings: bookings.filter(b => {
        const bookingDate = new Date(b.startTime);
        return bookingDate >= today && bookingDate < tomorrow;
      }).length,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Continue with empty data
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Professional Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {session.user.name}. Here&apos;s what&apos;s happening with your schedule.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Shifts"
          value={stats.totalShifts.toString()}
          description="In the next 7 days"
          icon="calendar"
        />
        <StatsCard
          title="Upcoming Shifts"
          value={stats.upcomingShifts.toString()}
          description="Starting from today"
          icon="clock"
        />
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings.toString()}
          description="In the next 7 days"
          icon="users"
        />
        <StatsCard
          title="Today&apos;s Bookings"
          value={stats.todayBookings.toString()}
          description="Bookings for today"
          icon="check-circle"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Shifts */}
        <UpcomingShifts shifts={shifts} professionalId={professionalId} />

        {/* Recent Bookings */}
        <RecentBookings bookings={bookings} />
      </div>
    </div>
  );
}