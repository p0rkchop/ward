import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/app/lib/db';
import { checkCode } from '@/app/lib/twilio';
import { Role } from '@/app/generated/prisma/enums';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'phone',
      credentials: {
        phoneNumber: { label: 'Phone Number', type: 'text' },
        code: { label: 'Verification Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.code) {
          throw new Error('Phone number and verification code required');
        }

        // Strip to digits only — must match what was used to send the code
        const phone = credentials.phoneNumber.replace(/\D/g, '');
        const code = credentials.code.trim();

        console.log('[authorize]', JSON.stringify({ phone, codeLen: code.length }));

        // Verify the code with Twilio
        const result = await checkCode(phone, code);
        if (!result.ok) {
          console.log('[authorize] verification failed:', result.error);
          throw new Error(result.error ?? 'Invalid verification code');
        }

        console.log('[authorize] code verified, looking up user');

        // Find or create user
        let user = await db.user.findUnique({ where: { phoneNumber: phone } });
        if (!user) {
          user = await db.user.create({
            data: {
              phoneNumber: phone,
              name: `User ${phone.slice(-4)}`,
              role: Role.CLIENT,
            },
          });
        }

        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.phoneNumber = user.phoneNumber;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
