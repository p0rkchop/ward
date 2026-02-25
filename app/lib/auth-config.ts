import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/app/lib/db';
import { verifyCode } from '@/app/lib/twilio';
import { Role } from '@/app/generated/prisma/enums';

import type { NextAuthOptions } from 'next-auth';

// Validate required environment variables
function validateAuthConfig() {
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_VERIFY_SERVICE_SID',
  ] as const;

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn if using default secrets in production
  if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
    console.warn('⚠️  WARNING: Using default NEXTAUTH_SECRET. Change this in production!');
  }
  if (process.env.NEXTAUTH_URL === 'http://localhost:3000' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using localhost NEXTAUTH_URL in production!');
  }
}

// Validate on first request (server-side only), not at module load time
// to avoid build failures when env vars aren't available.
let authConfigValidated = false;
function ensureAuthConfig() {
  if (!authConfigValidated && typeof window === 'undefined') {
    validateAuthConfig();
    authConfigValidated = true;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'phone',
      credentials: {
        phoneNumber: { label: 'Phone Number', type: 'text' },
        code: { label: 'Verification Code', type: 'text' },
      },
      async authorize(credentials) {
        ensureAuthConfig();

        if (!credentials?.phoneNumber || !credentials?.code) {
          throw new Error('Phone number and verification code required');
        }

        const phoneNumber = credentials.phoneNumber.replace(/\D/g, '');
        console.log('[authorize] Raw phoneNumber:', JSON.stringify(credentials.phoneNumber), '→ Stripped:', JSON.stringify(phoneNumber), '| Code:', JSON.stringify(credentials.code));        

        const verification = await verifyCode(phoneNumber, credentials.code);
        if (!verification.success) {
          throw new Error('Invalid verification code');
        }

        let user = await db.user.findUnique({
          where: { phoneNumber },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              phoneNumber,
              name: `User ${phoneNumber.slice(-4)}`,
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
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};