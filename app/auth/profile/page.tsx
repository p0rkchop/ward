'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Role } from '@/app/generated/prisma/enums';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const user = session!.user;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign out
              </button>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{user.name || 'Not set'}</dd>
                </div>
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{user.phoneNumber}</dd>
                </div>
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === Role.ADMIN
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === Role.PROFESSIONAL
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </dd>
                </div>
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">{user.id}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Role Information</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {user.role === Role.CLIENT && 'As a client, you can browse available timeslots and book appointments with professionals.'}
                {user.role === Role.PROFESSIONAL && 'As a professional, you can create shifts for resources and manage your bookings.'}
                {user.role === Role.ADMIN && 'As an administrator, you can manage resources, users, and system settings.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}