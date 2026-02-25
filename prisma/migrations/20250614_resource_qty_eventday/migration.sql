-- Add quantity and professionalsPerUnit to Resource
ALTER TABLE "Resource" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Resource" ADD COLUMN "professionalsPerUnit" INTEGER NOT NULL DEFAULT 1;

-- Add defaultStartTime and defaultEndTime to Event
ALTER TABLE "Event" ADD COLUMN "defaultStartTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "Event" ADD COLUMN "defaultEndTime" TEXT NOT NULL DEFAULT '17:00';

-- Create EventDay table
CREATE TABLE "EventDay" (
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
);

-- EventDay indexes
CREATE UNIQUE INDEX "EventDay_eventId_date_key" ON "EventDay"("eventId", "date");
CREATE INDEX "EventDay_eventId_idx" ON "EventDay"("eventId");
CREATE INDEX "EventDay_date_idx" ON "EventDay"("date");
CREATE INDEX "EventDay_deletedAt_idx" ON "EventDay"("deletedAt");
