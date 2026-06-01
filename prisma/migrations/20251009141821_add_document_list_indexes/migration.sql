-- CreateIndex
CREATE INDEX "document_organizationId_isArchived_deletedAt_createdAt_idx" ON "public"."document"("organizationId", "isArchived", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "document_organizationId_createdAt_idx" ON "public"."document"("organizationId", "createdAt" DESC);
