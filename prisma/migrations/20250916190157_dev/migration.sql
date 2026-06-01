-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."DocumentStatus" ADD VALUE 'uploading';
ALTER TYPE "public"."DocumentStatus" ADD VALUE 'upload_error';

-- AlterTable
ALTER TABLE "public"."document" ALTER COLUMN "modelProvider" SET DEFAULT 'claude_4_sonnet';

-- AlterTable
ALTER TABLE "public"."order" ALTER COLUMN "modelProvider" SET DEFAULT 'claude_4_sonnet';
