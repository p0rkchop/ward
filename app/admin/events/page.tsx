import { getEvents } from '@/app/lib/event-actions';
import EventsManager from './components/EventsManager';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        </div>
        <EventsManager initialEvents={events} />
      </div>
    </div>
  );
}
