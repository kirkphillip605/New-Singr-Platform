-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT;

-- CreateTable
CREATE TABLE "subscriptions" (
    "subscriptions_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ,
    "period_end" TIMESTAMPTZ,
    "trial_start" TIMESTAMPTZ,
    "trial_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN,
    "cancel_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "seats" INTEGER,
    "billing_interval" TEXT,
    "stripe_schedule_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscriptions_id")
);
