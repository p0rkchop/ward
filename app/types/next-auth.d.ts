import { Role } from '@/app/generated/prisma/enums';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    phoneNumber: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      phoneNumber: string;
      role: Role;
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
  }
}

export type SessionUser = {
  id: string;
  phoneNumber: string;
  role: Role;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};