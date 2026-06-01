/*
  Warnings:

  - You are about to drop the column `orderId` on the `document` table. All the data in the column will be lost.
  - You are about to drop the `order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."document" DROP CONSTRAINT "document_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."order" DROP CONSTRAINT "order_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."order" DROP CONSTRAINT "order_userId_fkey";

-- DropIndex
DROP INDEX "public"."document_orderId_idx";

-- AlterTable
ALTER TABLE "public"."document" DROP COLUMN "orderId";

-- DropTable
DROP TABLE "public"."order";
