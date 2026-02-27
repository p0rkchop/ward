import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import ProfessionalNav from './components/ProfessionalNav';

export const dynamic = 'force-dynamic';

export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.PROFESSIONAL) {
    redirect('/auth/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <ProfessionalNav user={session.user} />
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}