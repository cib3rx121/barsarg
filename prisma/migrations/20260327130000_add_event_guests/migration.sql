CREATE TABLE "EventGuest" (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'YES',
  "splitProfile" TEXT NOT NULL DEFAULT 'ALL',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventGuest_eventId_status_idx" ON "EventGuest"("eventId", "status");

ALTER TABLE "EventGuest"
ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

