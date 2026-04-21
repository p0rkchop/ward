import { notFound } from 'next/navigation';
import AuthTestClient from './AuthTestClient';

export default function AuthTestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <AuthTestClient />;
}
