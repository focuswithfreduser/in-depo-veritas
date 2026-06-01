-- CreateIndex
CREATE INDEX "document_createdAt_idx" ON "public"."document"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "document_status_idx" ON "public"."document"("status");

-- CreateIndex
CREATE INDEX "document_userId_idx" ON "public"."document"("userId");

-- CreateIndex
CREATE INDEX "document_orderId_idx" ON "public"."document"("orderId");
