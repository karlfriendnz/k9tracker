-- Trainer-configurable column visibility for the /clients list
ALTER TABLE "trainer_profiles"
  ADD COLUMN "clientListColumns" JSONB NOT NULL
    DEFAULT '["email","dog","nextSession","compliance"]';
