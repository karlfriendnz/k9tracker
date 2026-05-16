-- Client self-booking. Additive: per-package opt-in + a BookingRequest
-- model for the approval path. Instant-book packages skip the model.

ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "clientSelfBook"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "selfBookRequiresApproval" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "booking_requests" (
  "id"                       TEXT NOT NULL,
  "trainerId"                TEXT NOT NULL,
  "clientId"                 TEXT NOT NULL,
  "packageId"                TEXT NOT NULL,
  "dogId"                    TEXT,
  "sessionDates"             JSONB NOT NULL DEFAULT '[]',
  "status"                   "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note"                     TEXT,
  "resultingClientPackageId" TEXT,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"                TIMESTAMP(3),
  CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_requests_trainerId_status_idx" ON "booking_requests"("trainerId", "status");
CREATE INDEX IF NOT EXISTS "booking_requests_clientId_idx" ON "booking_requests"("clientId");

DO $$ BEGIN
  ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
