import { getServerSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';
import { getBrandingImage, getGeneralSettings } from '@/app/lib/branding-actions';
import BrandingUpload from './components/BrandingUpload';
import EmailTestPanel from './components/EmailTestPanel';
import GeneralSettings from './components/GeneralSettings';
import DangerZone from './components/DangerZone';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== Role.ADMIN) {
    redirect('/auth/unauthorized');
  }

  const [brandingImageUrl, generalSettings] = await Promise.all([
    getBrandingImage(),
    getGeneralSettings(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          System Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure system settings and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <BrandingUpload initialImageUrl={brandingImageUrl} />

        <GeneralSettings initialSettings={generalSettings} />

        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
          <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Database</h2>
          <div className="mt-4 space-y-4">
            <div>
              <button
                type="button"
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Export Data
              </button>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Export all system data as JSON. (Functionality to be implemented in Phase 7)
              </p>
            </div>
            <div>
              <button
                type="button"
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Clear Test Data
              </button>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Remove all test data (soft-deleted records older than 30 days). (Functionality to be implemented in Phase 7)
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
          <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Notifications</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Send email notifications for bookings, cancellations, and reminders</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <EmailTestPanel />

        <DangerZone />
      </div>
    </div>
  );
}