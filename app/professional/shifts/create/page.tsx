import { getServerSession } from '@/app/lib/auth';
import { getActiveResources } from '@/app/lib/shift-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { db } from '@/app/lib/db';
import CreateShiftForm from './CreateShiftForm';

export const dynamic = 'force-dynamic';

export default async function CreateShiftPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  const professionalId = session.user.id;

  // Get professional's event info
  const user = await db.user.findUnique({
    where: { id: professionalId },
    select: { eventId: true },
  });

  const eventId = user?.eventId ?? null;

  // Get resources filtered by event (if assigned to one)
  const resources = await getActiveResources(eventId);

  // Get event day info for time restrictions
  let eventDays: { date: string; startTime: string; endTime: string }[] = [];
  if (eventId) {
    const days = await db.eventDay.findMany({
      where: { eventId, deletedAt: null, isActive: true },
      orderBy: { date: 'asc' },
      select: { date: true, startTime: true, endTime: true },
    });
    eventDays = days.map((d) => ({
      date: d.date.toISOString().split('T')[0],
      startTime: d.startTime,
      endTime: d.endTime,
    }));
  }

  return (
    <CreateShiftForm
      professionalId={professionalId}
      resources={resources}
      eventDays={eventDays}
    />
  );
}