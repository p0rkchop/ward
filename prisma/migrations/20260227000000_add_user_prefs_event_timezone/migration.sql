-- AlterTable: Add user preference fields
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "User" ADD COLUMN "timeFormat" TEXT NOT NULL DEFAULT '12h';
ALTER TABLE "User" ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY';
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';

-- AlterTable: Add timezone to Event
ALTER TABLE "Event" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Chicago';
