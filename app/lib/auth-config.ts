import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/app/lib/db';
// import { checkCode } from '@/app/lib/twilio'; // Twilio disabled — using static code
import { Role } from '@/app/generated/prisma/enums';
import type { NextAuthOptions } from 'next-auth';

// Static verification code for development/testing
const STATIC_CODE = '123456';

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

        const phone = credentials.phoneNumber.replace(/\D/g, '');
        const code = credentials.code.trim();

        // Static code check (replaces Twilio for now)
        if (code !== STATIC_CODE) {
          console.log('[authorize] wrong code', JSON.stringify({ phone, code }));
          throw new Error('Invalid verification code');
        }

        // Find or create user — wrapped in try/catch to surface DB errors
        try {
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

          console.log('[authorize] success', JSON.stringify({ phone, userId: user.id, role: user.role }));

          return {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            role: user.role,
          };
        } catch (dbErr: unknown) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          console.log('[authorize] DB error', JSON.stringify({ phone, error: msg }));
          throw new Error(`Database error: ${msg}`);
        }
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
