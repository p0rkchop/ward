import { PrismaClient } from '@/app/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDb() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Validate Turso auth token for remote connections
  const isRemote = url.startsWith('libsql://')
  if (isRemote && !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN environment variable is required for Turso database')
  }

  try {
    // Use the libSQL adapter for both local file-based SQLite and remote Turso.
    // @libsql/client supports both "file:./dev.db" and "libsql://..." URLs.
    const { createClient } = require('@libsql/client')
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')

    const libsql = createClient({
      url,
      ...(isRemote ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
    })

    const adapter = new PrismaLibSQL(libsql)
    const prisma = new PrismaClient({ adapter })
    globalForPrisma.prisma = prisma
    return prisma
  } catch (error) {
    // Only log full error in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to initialize libSQL adapter:', error)
    } else {
      console.error('Failed to initialize libSQL adapter')
    }
    throw new Error(
      'Failed to initialize database adapter. ' +
      'Make sure @libsql/client and @prisma/adapter-libsql are installed.'
    )
  }
}

export const db = getDb()