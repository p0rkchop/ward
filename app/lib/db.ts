import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDb(): PrismaClient {
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

  // PrismaLibSql accepts a Config object and creates its own libSQL client internally.
  // Supports both local file-based SQLite ("file:./dev.db") and remote Turso ("libsql://...").
  const adapter = new PrismaLibSql({
    url,
    ...(isRemote ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  })

  const prisma = new PrismaClient({ adapter })
  globalForPrisma.prisma = prisma
  return prisma
}

/**
 * Lazy-initialized database client.
 * The actual connection is only created when `db` is first accessed at runtime,
 * not at module-import time. This prevents build-time failures on Vercel where
 * DATABASE_URL is not available during static page collection.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    return Reflect.get(client, prop, client)
  },
})