import { redirect } from 'next/navigation';
import { getServerSession } from '@/app/lib/auth';

/**
 * Root page — redirects based on role.
 * The middleware also handles this, but this is a server-side fallback.
 */
export default async function Home() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // New users must complete setup before accessing any dashboard
  if (!session.user.setupComplete) {
    redirect('/auth/setup');
  }

  switch (session.user.role) {
    case 'ADMIN':
      redirect('/admin/dashboard');
    case 'PROFESSIONAL':
      redirect('/professional/dashboard');
    case 'CLIENT':
      redirect('/client/dashboard');
    default:
      redirect('/auth/login');
  }
}
