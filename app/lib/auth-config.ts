import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/app/lib/db';
import { checkCode, normalizePhone } from '@/app/lib/twilio';
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

        const phone = normalizePhone(credentials.phoneNumber);
        const code = credentials.code.trim();

        // Verify code via Twilio Verify
        const result = await checkCode(phone, code);
        if (!result.ok) {
          console.log('[authorize] Twilio check failed', JSON.stringify({ phone, error: result.error }));
          throw new Error(result.error || 'Invalid verification code');
        }

        // Try DB lookup / create — fall back to synthetic user if DB isn't migrated
        try {
          let isNewUser = false;
          let user = await db.user.findUnique({ where: { phoneNumber: phone } });
          if (!user) {
            isNewUser = true;
            user = await db.user.create({
              data: {
                phoneNumber: phone,
                name: `User ${phone.slice(-4)}`,
                role: Role.CLIENT,
                setupComplete: false,
              },
            });
          }

          console.log('[authorize] DB user', JSON.stringify({ phone, userId: user.id, role: user.role, isNewUser, setupComplete: user.setupComplete }));

          return {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            role: user.role,
            setupComplete: user.setupComplete,
            isNewUser,
          };
        } catch (dbErr: unknown) {
          // DB tables may not exist yet — return a synthetic user so the
          // JWT session can still be issued after a successful Twilio verify.
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          console.log('[authorize] DB unavailable, using synthetic user', JSON.stringify({ phone, error: msg }));

          return {
            id: `synthetic-${phone}`,
            phoneNumber: phone,
            name: `User ${phone.slice(-4)}`,
            role: Role.CLIENT,
            setupComplete: false,
            isNewUser: true,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — seed from authorize()
        token.phoneNumber = user.phoneNumber;
        token.role = user.role;
        token.setupComplete = user.setupComplete;
        token.isNewUser = user.isNewUser;
        token.userValid = true;
      } else if (token.sub) {
        // Every subsequent request — validate user still exists & is active
        try {
          const dbUser = await db.user.findUnique({ where: { id: token.sub } });
          if (!dbUser || dbUser.deletedAt) {
            console.log('[jwt] User invalidated', JSON.stringify({ id: token.sub, found: !!dbUser, deleted: !!dbUser?.deletedAt }));
            token.userValid = false;
          } else {
            // Sync latest DB state into token
            token.role = dbUser.role;
            token.setupComplete = dbUser.setupComplete;
            token.phoneNumber = dbUser.phoneNumber;
            token.userValid = true;
          }
        } catch (err) {
          // Don't invalidate on transient DB errors
          console.log('[jwt] DB check error, keeping current token', err instanceof Error ? err.message : String(err));
        }
      }
      return token;
    },
    async session({ session, token }) {
      // If user has been invalidated, strip session so pages see no user
      if (token.userValid === false) {
        session.user = undefined as any;
        return session;
      }
      if (session.user) {
        session.user.id = token.sub!;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.role = token.role as Role;
        session.user.setupComplete = token.setupComplete as boolean;
        session.user.isNewUser = token.isNewUser as boolean;
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
