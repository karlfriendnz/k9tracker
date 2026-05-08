-- Revert: invite_client moves back to step 7. The schedule_session transition
-- now directs the trainer to view their (already-existing) client's profile,
-- not to invite another. Order:
--   1 availability
--   2 schedule_session
--   3 business_profile
--   4 intake_form
--   5 program_package
--   6 achievements
--   7 invite_client
--   8 client_view

UPDATE onboarding_steps SET "order" = 3 WHERE key = 'business_profile';
UPDATE onboarding_steps SET "order" = 4 WHERE key = 'intake_form';
UPDATE onboarding_steps SET "order" = 5 WHERE key = 'program_package';
UPDATE onboarding_steps SET "order" = 6 WHERE key = 'achievements';
UPDATE onboarding_steps SET "order" = 7 WHERE key = 'invite_client';
