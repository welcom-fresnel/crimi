ALTER TABLE "evidences"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "collectedAt" TIMESTAMP(3),
  ADD COLUMN "collectedAtLocation" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "evidences_category_idx" ON "evidences"("category");