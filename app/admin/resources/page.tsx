import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getResources } from '@/app/lib/admin-actions';
import ResourceTable from './components/ResourceTable';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  let resources: Awaited<ReturnType<typeof getResources>> = [];
  try {
    resources = await getResources();
  } catch (error) {
    console.error('Error fetching resources:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Resource Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create, edit, and manage service resources.
            </p>
          </div>
        </div>
      </div>

      <ResourceTable initialResources={resources} />
    </div>
  );
}