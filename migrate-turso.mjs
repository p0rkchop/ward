import { createClient } from "@libsql/client";

const client = createClient({
  url: "libsql://ward-production-p0rkchop.aws-us-east-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "professionalId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    CONSTRAINT "Shift_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Shift_professionalId_startTime_endTime_key" ON "Shift"("professionalId", "startTime", "endTime")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Shift_resourceId_startTime_endTime_key" ON "Shift"("resourceId", "startTime", "endTime")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Booking_shiftId_startTime_endTime_key" ON "Booking"("shiftId", "startTime", "endTime")`,
  `CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")`,
  `CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Resource_isActive_idx" ON "Resource"("isActive")`,
  `CREATE INDEX IF NOT EXISTS "Resource_deletedAt_idx" ON "Resource"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Shift_professionalId_idx" ON "Shift"("professionalId")`,
  `CREATE INDEX IF NOT EXISTS "Shift_resourceId_idx" ON "Shift"("resourceId")`,
  `CREATE INDEX IF NOT EXISTS "Shift_startTime_idx" ON "Shift"("startTime")`,
  `CREATE INDEX IF NOT EXISTS "Shift_endTime_idx" ON "Shift"("endTime")`,
  `CREATE INDEX IF NOT EXISTS "Shift_deletedAt_idx" ON "Shift"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Shift_professionalId_startTime_deletedAt_idx" ON "Shift"("professionalId", "startTime", "deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Shift_resourceId_startTime_deletedAt_idx" ON "Shift"("resourceId", "startTime", "deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Booking_clientId_idx" ON "Booking"("clientId")`,
  `CREATE INDEX IF NOT EXISTS "Booking_shiftId_idx" ON "Booking"("shiftId")`,
  `CREATE INDEX IF NOT EXISTS "Booking_startTime_idx" ON "Booking"("startTime")`,
  `CREATE INDEX IF NOT EXISTS "Booking_deletedAt_idx" ON "Booking"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status")`,
  `CREATE INDEX IF NOT EXISTS "Booking_shiftId_startTime_status_deletedAt_idx" ON "Booking"("shiftId", "startTime", "status", "deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Booking_clientId_startTime_deletedAt_idx" ON "Booking"("clientId", "startTime", "deletedAt")`,
];

console.log(`Running ${statements.length} statements...`);

for (const sql of statements) {
  const label = sql.match(/"(\w+)"/)?.[1] || sql.slice(0, 50);
  try {
    await client.execute(sql);
    console.log(`  OK  ${label}`);
  } catch (err) {
    console.error(`  ERR ${label}: ${err.message}`);
  }
}

const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log("\nTables:", tables.rows.map(r => r.name));

const userCols = await client.execute("PRAGMA table_info('User')");
console.log("User columns:", userCols.rows.map(r => r.name));

client.close();
