-- CreateIndex
CREATE INDEX "collections_userId_isFavorite_idx" ON "collections"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "collections_userId_updatedAt_idx" ON "collections"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "items_userId_isPinned_idx" ON "items"("userId", "isPinned");

-- CreateIndex
CREATE INDEX "items_userId_isFavorite_idx" ON "items"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "items_userId_updatedAt_idx" ON "items"("userId", "updatedAt");
