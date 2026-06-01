/*
  Warnings:

  - A unique constraint covering the columns `[trialId]` on the table `organization` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('Professional');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'retired');

-- CreateEnum
CREATE TYPE "SubscriptionRetirementReason" AS ENUM ('unpaid', 'canceled');

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "stripeEventIdentifier" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "freeForever" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialId" TEXT;

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'Professional',
    "status" "SubscriptionStatus" NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "retirementReason" "SubscriptionRetirementReason",
    "pastDue" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "creditsAvailable" INTEGER NOT NULL DEFAULT 1,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "trial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_trialId_key" ON "organization"("trialId");

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "trial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
* This is a custom addition to the Prisma generated code, enforcing a single
* active subscription for each organization.
*/
CREATE UNIQUE INDEX subscriptions_active_canceled_unique_idx ON "subscription" ("organizationId") WHERE status IN ('active', 'canceled');

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_check_period_dates" CHECK ("periodEnd" > "periodStart");
ALTER TABLE "trial" ADD CONSTRAINT "trial_check_valid_credits" CHECK (NOT ("creditsUsed" > "creditsAvailable"));
