-- Trainer-configurable extra fields shown on schedule blocks (up to 2)
ALTER TABLE "trainer_profiles"
  ADD COLUMN "scheduleExtraFields" JSONB NOT NULL DEFAULT '[]';
