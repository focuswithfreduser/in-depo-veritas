/*
  Warnings:

  - The values [cancelled,troubleshooting,uploading,upload_error] on the enum `DocumentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."DocumentStatus_new" AS ENUM ('pending', 'processing', 'complete', 'failed');
ALTER TABLE "public"."document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."document" ALTER COLUMN "status" TYPE "public"."DocumentStatus_new" USING ("status"::text::"public"."DocumentStatus_new");
ALTER TYPE "public"."DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "public"."DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "public"."DocumentStatus_old";
ALTER TABLE "public"."document" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;
