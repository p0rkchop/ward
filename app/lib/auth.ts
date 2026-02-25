import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth-config';

export const getServerSession = () => nextAuthGetServerSession(authOptions);
