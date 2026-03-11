import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getGeneralSettings } from '@/app/lib/branding-actions';
import ClientNav from './components/ClientNav';
import PushNotificationBanner from '@/app/components/PushNotificationBanner';
import pkg from '../../package.json';

export const dynamic = 'force-dynamic';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!session.user.setupComplete) {
    redirect('/auth/setup');
  }

  if (session.user.role !== Role.CLIENT) {
    redirect('/auth/unauthorized');
  }

  const { siteName } = await getGeneralSettings();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <ClientNav user={session.user} siteName={siteName} version={pkg.version} />
      <PushNotificationBanner />
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}