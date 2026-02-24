import originalGetServerSession from 'next-auth';
import { authOptions } from '@/app/lib/auth-config';

export const getServerSession = () => originalGetServerSession(authOptions);