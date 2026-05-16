-- General scheduling waitlist. Trainer-wide list of people the trainer
-- wants but has no availability for yet. Additive; distinct from the
-- per-ClassRun waitlist. Subject is an existing client OR a prospect.

DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'CONTACTED', 'SCHEDULED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id"                 TEXT NOT NULL,
  "trainerId"          TEXT NOT NULL,
  "clientId"           TEXT,
  "name"               TEXT NOT NULL,
  "email"              TEXT,
  "phone"              TEXT,
  "packageId"          TEXT,
  "request"            TEXT,
  "sessionType"        "SessionType",
  "preferredDays"      INTEGER[] NOT NULL DEFAULT '{}',
  "preferredTimeStart" TEXT,
  "preferredTimeEnd"   TEXT,
  "earliestStart"      DATE,
  "notes"              TEXT,
  "priority"           INTEGER NOT NULL DEFAULT 0,
  "status"             "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "contactedAt"        TIMESTAMP(3),
  "convertedAt"        TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "waitlist_entries_trainerId_status_idx" ON "waitlist_entries"("trainerId", "status");
CREATE INDEX IF NOT EXISTS "waitlist_entries_clientId_idx" ON "waitlist_entries"("clientId");
CREATE INDEX IF NOT EXISTS "waitlist_entries_packageId_idx" ON "waitlist_entries"("packageId");

DO $$ BEGIN
  ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
