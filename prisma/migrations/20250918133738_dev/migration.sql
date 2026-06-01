-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "productUpdates" BOOLEAN NOT NULL DEFAULT true;
