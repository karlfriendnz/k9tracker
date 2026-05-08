-- Drop the SMS / QR code language from the invite_client step body — only
-- email invites are wired up. SMS + QR are roadmap items, not shipped yet.
UPDATE "onboarding_steps"
SET "body" = 'The moment this all starts paying off. Send your client an invite email and they''ll get a sign-up link.'
WHERE "key" = 'invite_client';
