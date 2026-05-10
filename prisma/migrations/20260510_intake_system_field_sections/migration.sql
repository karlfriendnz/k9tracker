ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "intakeSystemFieldSections" JSONB NOT NULL DEFAULT '{}';
