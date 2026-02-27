-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "criminalId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "fileUrls" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidences_criminalId_idx" ON "evidences"("criminalId");

-- CreateIndex
CREATE INDEX "evidences_createdById_idx" ON "evidences"("createdById");

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_criminalId_fkey" FOREIGN KEY ("criminalId") REFERENCES "criminals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
