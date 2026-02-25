import { Role } from '@/app/generated/prisma/enums';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    phoneNumber: string;
    role: Role;
    setupComplete: boolean;
  }

  interface Session {
    user: {
      id: string;
      phoneNumber: string;
      role: Role;
      setupComplete: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    phoneNumber: string;
    role: Role;
    setupComplete: boolean;
  }
}

export type SessionUser = {
  id: string;
  phoneNumber: string;
  role: Role;
  setupComplete: boolean;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};