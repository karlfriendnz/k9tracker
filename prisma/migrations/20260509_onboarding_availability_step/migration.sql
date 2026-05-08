-- Reorder onboarding steps to put "Set your availability" first and
-- "Schedule a session" second, so the trainer learns the calendar before
-- doing anything else. Two-pass UPDATE so we don't worry about ordering
-- collisions if a unique constraint is later added.

UPDATE onboarding_steps SET "order" = 8 WHERE key = 'client_view';
UPDATE onboarding_steps SET "order" = 7 WHERE key = 'invite_client';
UPDATE onboarding_steps SET "order" = 6 WHERE key = 'achievements';
UPDATE onboarding_steps SET "order" = 5 WHERE key = 'program_package';
UPDATE onboarding_steps SET "order" = 4 WHERE key = 'intake_form';
UPDATE onboarding_steps SET "order" = 3 WHERE key = 'business_profile';
UPDATE onboarding_steps SET "order" = 2 WHERE key = 'schedule_session';

-- Insert availability step (idempotent — re-runs update existing row).
INSERT INTO onboarding_steps (id, key, "order", title, body, "ctaLabel", "ctaHref", skippable, "skipWarning", "publishedAt", "createdAt", "updatedAt")
VALUES (
  'clxavail0000000000000000',
  'availability',
  1,
  'Block out when you train',
  'Tell PupManager which days and hours you''re available — clients can only book inside these. One day is enough to start.',
  'Set your hours',
  '/schedule#availability',
  true,
  NULL,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  "order" = 1,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  "ctaLabel" = EXCLUDED."ctaLabel",
  "ctaHref" = EXCLUDED."ctaHref",
  "publishedAt" = COALESCE(onboarding_steps."publishedAt", NOW()),
  "updatedAt" = NOW();
