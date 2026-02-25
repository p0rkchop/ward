import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Read token from .env.local, stripping quotes
let authToken = process.env.TURSO_AUTH_TOKEN;
if (!authToken) {
  try {
    const envFile = readFileSync(".env.local", "utf8");
    const match = envFile.match(/TURSO_AUTH_TOKEN=["']?([^"'\n]+)/);
    if (match) authToken = match[1];
  } catch {}
}

const client = createClient({
  url: "libsql://ward-production-p0rkchop.aws-us-east-2.turso.io",
  authToken,
});

const statements = [
  // ── Tables ──
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "User_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "professionalPassword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "adminId" TEXT NOT NULL,
    CONSTRAINT "Event_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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

  // ── ALTER existing User table to add new columns (safe if already exist) ──
  // SQLite doesn't support IF NOT EXISTS for ALTER, so we wrap in try/catch in JS
  `ALTER TABLE "User" ADD COLUMN "setupComplete" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE`,

  // ── ALTER Resource table to add quantity and professionalsPerUnit ──
  `ALTER TABLE "Resource" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "Resource" ADD COLUMN "professionalsPerUnit" INTEGER NOT NULL DEFAULT 1`,

  // ── ALTER Event table to add defaultStartTime and defaultEndTime ──
  `ALTER TABLE "Event" ADD COLUMN "defaultStartTime" TEXT NOT NULL DEFAULT '09:00'`,
  `ALTER TABLE "Event" ADD COLUMN "defaultEndTime" TEXT NOT NULL DEFAULT '17:00'`,

  // ── EventDay table ──
  `CREATE TABLE IF NOT EXISTS "EventDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "EventDay_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // ── Unique indexes ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Shift_professionalId_startTime_endTime_key" ON "Shift"("professionalId", "startTime", "endTime")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Shift_resourceId_startTime_endTime_key" ON "Shift"("resourceId", "startTime", "endTime")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Booking_shiftId_startTime_endTime_key" ON "Booking"("shiftId", "startTime", "endTime")`,

  // ── Regular indexes ──
  `CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")`,
  `CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "User_eventId_idx" ON "User"("eventId")`,
  `CREATE INDEX IF NOT EXISTS "User_setupComplete_idx" ON "User"("setupComplete")`,
  `CREATE INDEX IF NOT EXISTS "Event_adminId_idx" ON "Event"("adminId")`,
  `CREATE INDEX IF NOT EXISTS "Event_isActive_idx" ON "Event"("isActive")`,
  `CREATE INDEX IF NOT EXISTS "Event_deletedAt_idx" ON "Event"("deletedAt")`,
  `CREATE INDEX IF NOT EXISTS "Event_startDate_endDate_idx" ON "Event"("startDate", "endDate")`,
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

  // ── EventDay indexes ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "EventDay_eventId_date_key" ON "EventDay"("eventId", "date")`,
  `CREATE INDEX IF NOT EXISTS "EventDay_eventId_idx" ON "EventDay"("eventId")`,
  `CREATE INDEX IF NOT EXISTS "EventDay_date_idx" ON "EventDay"("date")`,
  `CREATE INDEX IF NOT EXISTS "EventDay_deletedAt_idx" ON "EventDay"("deletedAt")`,

  // ── ALTER Resource table to add location ──
  `ALTER TABLE "Resource" ADD COLUMN "location" TEXT`,

  // ── EventDayBlackout table ──
  `CREATE TABLE IF NOT EXISTS "EventDayBlackout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "eventDayId" TEXT NOT NULL,
    CONSTRAINT "EventDayBlackout_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  // ── EventDayBlackout indexes ──
  `CREATE INDEX IF NOT EXISTS "EventDayBlackout_eventDayId_idx" ON "EventDayBlackout"("eventDayId")`,
  `CREATE INDEX IF NOT EXISTS "EventDayBlackout_deletedAt_idx" ON "EventDayBlackout"("deletedAt")`,
];

console.log(`Running ${statements.length} statements...`);

for (const sql of statements) {
  const label = sql.match(/"(\w+)"/)?.[1] || sql.slice(0, 50);
  try {
    await client.execute(sql);
    console.log(`  OK  ${label}`);
  } catch (err) {
    // Ignore "duplicate column" errors from ALTER TABLE on existing columns
    if (err.message?.includes("duplicate column") || err.message?.includes("already exists")) {
      console.log(`  SKIP ${label} (already exists)`);
    } else {
      console.error(`  ERR ${label}: ${err.message}`);
    }
  }
}

const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log("\nTables:", tables.rows.map(r => r.name));

const userCols = await client.execute("PRAGMA table_info('User')");
console.log("User columns:", userCols.rows.map(r => r.name));

const eventCols = await client.execute("PRAGMA table_info('Event')");
console.log("Event columns:", eventCols.rows.map(r => r.name));

const resourceCols = await client.execute("PRAGMA table_info('Resource')");
console.log("Resource columns:", resourceCols.rows.map(r => r.name));

const eventDayCols = await client.execute("PRAGMA table_info('EventDay')");
console.log("EventDay columns:", eventDayCols.rows.map(r => r.name));

client.close();
