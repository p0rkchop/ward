import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: 'calendar' | 'clock' | 'users' | 'check-circle';
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.281.022-.562.043-.844.062A15.99 15.99 0 019.844 7H17a5 5 0 015 5v6h-2.5z" />
    </svg>
  ),
  'check-circle': (
    <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0 rounded-md bg-gray-50 p-3">
          {iconMap[icon]}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{value}</dd>
          <dd className="mt-1 text-sm text-gray-500">{description}</dd>
        </div>
      </div>
    </div>
  );
}