import { getServerSession } from '@/app/lib/auth';
import { getProfessionalShifts, getEventShifts } from '@/app/lib/shift-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import AgendaView from './components/AgendaView';

export const dynamic = 'force-dynamic';

export default async function ProfessionalCalendar() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Fetch own shifts and all event shifts in parallel
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 31);

  let myShifts: Awaited<ReturnType<typeof getProfessionalShifts>> = [];
  let eventShifts: Awaited<ReturnType<typeof getEventShifts>> = [];

  try {
    [myShifts, eventShifts] = await Promise.all([
      getProfessionalShifts(professionalId, startDate, endDate),
      getEventShifts(startDate, endDate),
    ]);
  } catch (error) {
    console.error('Error fetching shifts:', error);
  }

  // Build agenda items from own shifts: one entry per booking
  type AgendaBooking = {
    id: string;
    startTime: string;
    endTime: string;
    clientName: string | null;
    resourceName: string;
    resourceDescription: string | null;
    professionalName: string | null;
    professionalId: string;
    shiftId: string;
    isOwnShift: boolean;
    hasBookings: boolean;
  };

  const myBookings: AgendaBooking[] = [];
  const emptyShifts: AgendaBooking[] = [];

  for (const shift of myShifts) {
    if (shift.bookings.length > 0) {
      for (const booking of shift.bookings) {
        myBookings.push({
          id: booking.id,
          startTime: new Date(booking.startTime).toISOString(),
          endTime: new Date(booking.endTime).toISOString(),
          clientName: null, // Will be fetched separately — booking only has clientId
          resourceName: shift.resource.name,
          resourceDescription: shift.resource.description,
          professionalName: session.user.name ?? null,
          professionalId,
          shiftId: shift.id,
          isOwnShift: true,
          hasBookings: true,
        });
      }
    } else {
      emptyShifts.push({
        id: shift.id,
        startTime: new Date(shift.startTime).toISOString(),
        endTime: new Date(shift.endTime).toISOString(),
        clientName: null,
        resourceName: shift.resource.name,
        resourceDescription: shift.resource.description,
        professionalName: session.user.name ?? null,
        professionalId,
        shiftId: shift.id,
        isOwnShift: true,
        hasBookings: false,
      });
    }
  }

  // Build other professionals' bookings from event shifts
  const myShiftIds = new Set(myShifts.map((s) => s.id));
  const otherBookings: AgendaBooking[] = [];

  for (const shift of eventShifts) {
    if (myShiftIds.has(shift.id)) continue; // skip own shifts
    for (const booking of shift.bookings) {
      otherBookings.push({
        id: booking.id,
        startTime: new Date(booking.startTime).toISOString(),
        endTime: new Date(booking.endTime).toISOString(),
        clientName: booking.client?.name ?? null,
        resourceName: shift.resource.name,
        resourceDescription: shift.resource.description,
        professionalName: shift.professional.name,
        professionalId: shift.professional.id,
        shiftId: shift.id,
        isOwnShift: false,
        hasBookings: true,
      });
    }
  }

  // Enrich own bookings with client names from event shifts data
  const eventShiftBookingMap = new Map<string, string | null>();
  for (const shift of eventShifts) {
    for (const booking of shift.bookings) {
      eventShiftBookingMap.set(booking.id, booking.client?.name ?? null);
    }
  }
  for (const b of myBookings) {
    b.clientName = eventShiftBookingMap.get(b.id) ?? b.clientName;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Your upcoming appointments and shifts.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <a
            href="/professional/shifts/create"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Create Shift
          </a>
          <a
            href="/professional/shifts"
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            All Shifts
          </a>
        </div>
      </div>

      <AgendaView
        myBookings={myBookings}
        emptyShifts={emptyShifts}
        otherBookings={otherBookings}
        professionalId={professionalId}
      />
    </div>
  );
}
