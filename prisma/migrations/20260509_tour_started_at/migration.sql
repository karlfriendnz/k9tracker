-- Explicit opt-in flag for the onboarding tour. Gates the floating FAB
-- + pulsing dots so they don't fire until the trainer has clicked
-- "Start the quick setup" / "Take the tour" — the welcome modal &
-- backfill banner alone shouldn't trigger them.

ALTER TABLE "trainer_onboarding_progress"
  ADD COLUMN IF NOT EXISTS "tourStartedAt" TIMESTAMP(3);

-- Backfill: any trainer who's already started clicking through wizard
-- steps has effectively opted in, so stamp them so the FAB doesn't
-- vanish from under them on first deploy.
UPDATE "trainer_onboarding_progress" p
SET "tourStartedAt" = NOW()
WHERE "tourStartedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "trainer_onboarding_step_progress" sp
    WHERE sp."progressId" = p.id
      AND (sp."completedAt" IS NOT NULL OR sp."skippedAt" IS NOT NULL OR sp."startedAt" IS NOT NULL)
  );
