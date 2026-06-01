-- AlterEnum
ALTER TYPE "public"."DocumentStatus" ADD VALUE 'deleted';

-- AlterTable
ALTER TABLE "public"."document" ADD COLUMN     "deletedAt" TIMESTAMP(3);
