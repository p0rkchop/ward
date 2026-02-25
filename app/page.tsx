import { redirect } from 'next/navigation';

/**
 * Root page — redirects to client dashboard.
 * Authentication is currently disabled.
 */
export default async function Home() {
  redirect('/client/dashboard');
}
