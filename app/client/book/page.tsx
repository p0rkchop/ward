import { getServerSession } from '@/app/lib/auth';
import { getAvailableTimeslots } from '@/app/lib/booking-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import BookAppointmentForm from './components/BookAppointmentForm';

export const dynamic = 'force-dynamic';

export default async function BookAppointmentPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.CLIENT) {
    redirect('/auth/unauthorized');
  }

  const clientId = session.user.id;

  // Get available timeslots for the next 7 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  let availableSlots: Awaited<ReturnType<typeof getAvailableTimeslots>>['availableSlots'] = [];
  let allSlots: Awaited<ReturnType<typeof getAvailableTimeslots>>['allSlots'] = [];

  try {
    const result = await getAvailableTimeslots(startDate, endDate);
    availableSlots = result.availableSlots;
    allSlots = result.allSlots;
  } catch (error) {
    console.error('Error fetching available timeslots:', error);
    // Continue with empty data
  }

  // Group slots by day
  const slotsByDay: Record<string, typeof availableSlots> = {};
  availableSlots.forEach(slot => {
    const dateKey = new Date(slot.start).toDateString();
    if (!slotsByDay[dateKey]) {
      slotsByDay[dateKey] = [];
    }
    slotsByDay[dateKey].push(slot);
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Book Appointment
        </h1>
        <p className="mt-2 text-gray-600">
          Select an available time slot for your appointment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BookAppointmentForm
            clientId={clientId}
            slotsByDay={slotsByDay}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium leading-6 text-gray-900">How it works</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <span className="text-sm font-semibold text-green-600">1</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">Select an available time slot</p>
                  <p className="text-xs text-gray-500">All slots are 30 minutes long</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <span className="text-sm font-semibold text-green-600">2</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">Click "Book Appointment"</p>
                  <p className="text-xs text-gray-500">System will match you with a professional</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <span className="text-sm font-semibold text-green-600">3</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">Get confirmation</p>
                  <p className="text-xs text-gray-500">View your appointment in My Appointments</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Availability Summary</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Available slots</span>
                <span className="text-sm font-semibold text-gray-900">{availableSlots.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total slots</span>
                <span className="text-sm font-semibold text-gray-900">{allSlots.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Days with availability</span>
                <span className="text-sm font-semibold text-gray-900">{Object.keys(slotsByDay).length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Need help?</h3>
            <p className="mt-2 text-sm text-gray-600">
              If you're having trouble finding a time slot, please try selecting a different day or contact support.
            </p>
            <div className="mt-4">
              <a
                href="#"
                className="text-sm font-medium text-green-600 hover:text-green-500"
              >
                Contact support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}