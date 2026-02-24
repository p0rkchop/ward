import { redirect } from 'next/navigation';
import { getServerSession } from '@/app/lib/auth';
import { Role } from '@/app/generated/prisma/enums';

/**
 * Root page — redirects to the appropriate dashboard based on role.
 * The middleware also handles this redirect, but this is a fallback in case
 * the page is rendered directly (e.g., static generation).
 */
export default async function Home() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  switch (session.user.role) {
    case Role.ADMIN:
      redirect('/admin/dashboard');
    case Role.PROFESSIONAL:
      redirect('/professional/dashboard');
    case Role.CLIENT:
      redirect('/client/dashboard');
    default:
      redirect('/auth/login');
  }
}
