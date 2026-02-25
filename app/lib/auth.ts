import type { Session } from 'next-auth';

/**
 * Authentication is currently DISABLED.
 * Returns a stub session with a fake CLIENT user so every page renders
 * without hitting the database or NextAuth.
 */
const STUB_SESSION: Session = {
  user: {
    id: 'stub-user-id',
    phoneNumber: '+10000000000',
    role: 'CLIENT' as any,
    name: 'Guest',
    email: null,
    image: null,
  },
  expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

export const getServerSession = async (): Promise<Session> => {
  return STUB_SESSION;
};
