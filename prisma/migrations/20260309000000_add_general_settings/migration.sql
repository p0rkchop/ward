-- AlterTable: add siteName and timeslotDuration to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "siteName" TEXT NOT NULL DEFAULT 'Ward';
ALTER TABLE "AppSettings" ADD COLUMN "timeslotDuration" INTEGER NOT NULL DEFAULT 30;
