import { ReactNode } from 'react';
import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: 'calendar' | 'clock' | 'users' | 'check-circle';
  href?: string;
}

const iconMap: Record<StatsCardProps['icon'], ReactNode> = {
  calendar: (
    <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  clock: (
    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  'check-circle': (
    <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function StatsCard({ title, value, description, icon, href }: StatsCardProps) {
  const content = (
    <div className="flex items-center">
      <div className="flex-shrink-0 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
        {iconMap[icon]}
      </div>
      <div className="ml-5 w-0 flex-1">
        <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{title}</dt>
        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{value}</dd>
        <dd className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</dd>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block overflow-hidden rounded-lg bg-white dark:bg-gray-900 px-4 py-5 shadow transition-shadow hover:shadow-md sm:p-6">
        {content}
      </Link>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 px-4 py-5 shadow sm:p-6">
      {content}
    </div>
  );
}