-- Fortnightly (and beyond) recurring availability slots.
-- cadenceWeeks: 1 = weekly (default, existing behaviour), 2 = fortnightly, etc.
-- firstDate: anchor date used to compute parity for cadence > 1.
ALTER TABLE "availability_slots"
  ADD COLUMN "cadenceWeeks" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "firstDate" DATE;

-- Trainer holiday / blackout periods. Days that fall inside one of these
-- ranges are treated as unavailable, regardless of weekly slots.
CREATE TABLE "blackout_periods" (
  "id"        TEXT PRIMARY KEY,
  "trainerId" TEXT NOT NULL,
  "reason"    TEXT,
  "startDate" DATE NOT NULL,
  "endDate"   DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blackout_periods_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "blackout_periods_trainerId_idx" ON "blackout_periods"("trainerId");
