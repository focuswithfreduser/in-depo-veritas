/*
  Warnings:

  - You are about to drop the column `failed` on the `document` table. All the data in the column will be lost.
  - You are about to drop the column `v2SummaryUrl` on the `document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('pending', 'processing', 'complete', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "public"."document" DROP COLUMN "failed",
DROP COLUMN "v2SummaryUrl",
ADD COLUMN     "status" "public"."DocumentStatus" NOT NULL DEFAULT 'pending';
