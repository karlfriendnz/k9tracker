-- Trainer-chosen grouping for the /clients list
ALTER TABLE "trainer_profiles"
  ADD COLUMN "clientListGroupBy" TEXT;
