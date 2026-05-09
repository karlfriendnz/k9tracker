-- Stripe billing fields. Customer + subscription IDs let us reconcile
-- webhook events, currentPeriodEnd drives the "renews on …" copy and the
-- access cutoff for cancelled subs. SubscriptionPlan.stripePriceId maps
-- our DB plan rows to Stripe Prices.

ALTER TABLE "trainer_profiles"
  ADD COLUMN "stripeCustomerId"     TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "currentPeriodEnd"     TIMESTAMP(3);

CREATE UNIQUE INDEX "trainer_profiles_stripeCustomerId_key"
  ON "trainer_profiles"("stripeCustomerId");
CREATE UNIQUE INDEX "trainer_profiles_stripeSubscriptionId_key"
  ON "trainer_profiles"("stripeSubscriptionId");

ALTER TABLE "subscription_plans"
  ADD COLUMN "stripePriceId" TEXT;

CREATE UNIQUE INDEX "subscription_plans_stripePriceId_key"
  ON "subscription_plans"("stripePriceId");

-- Add PAST_DUE to the SubscriptionStatus enum so we can mirror Stripe's
-- past_due state when payments fail.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE' BEFORE 'CANCELLED';
