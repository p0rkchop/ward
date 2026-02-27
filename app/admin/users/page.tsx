import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getUsers, type UserWithRelations } from '@/app/lib/admin-actions';
import UsersTable from './components/UsersTable';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  let users: UserWithRelations[] = [];
  try {
    users = await getUsers();
  } catch (error) {
    console.error('Error fetching users:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and manage user accounts and roles.
        </p>
      </div>

      <UsersTable initialUsers={users} />
    </div>
  );
}