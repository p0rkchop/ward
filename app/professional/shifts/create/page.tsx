import { getServerSession } from '@/app/lib/auth';
import { getActiveResources } from '@/app/lib/shift-actions';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
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
  const resources = await getActiveResources();

  return (
    <CreateShiftForm
      professionalId={professionalId}
      resources={resources}
    />
  );
}