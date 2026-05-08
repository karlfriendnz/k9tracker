-- Reorder the onboarding steps so the client invite + scheduling sit before
-- "view as client", which now lands last as a "see your work from the other
-- side" capstone:
--   5. invite_client     (was 6)
--   6. schedule_session  (was 7)
--   7. client_view       (was 5)
UPDATE "onboarding_steps" SET "order" = 100 WHERE "key" = 'client_view';
UPDATE "onboarding_steps" SET "order" = 5   WHERE "key" = 'invite_client';
UPDATE "onboarding_steps" SET "order" = 6   WHERE "key" = 'schedule_session';
UPDATE "onboarding_steps" SET "order" = 7   WHERE "key" = 'client_view';
