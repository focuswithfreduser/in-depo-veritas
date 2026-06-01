-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "discountCodesApplied" TEXT[] DEFAULT ARRAY[]::TEXT[];
