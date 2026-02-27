-- CreateTable
CREATE TABLE "arrestations" (
    "id" TEXT NOT NULL,
    "criminalId" TEXT NOT NULL,
    "arrestDate" TIMESTAMP(3),
    "arrestLocation" TEXT,
    "arrestingUnit" TEXT,
    "arrestingOfficer" TEXT,
    "warrantNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arrestations_criminalId_key" ON "arrestations"("criminalId");

-- CreateIndex
CREATE INDEX "arrestations_createdById_idx" ON "arrestations"("createdById");

-- AddForeignKey
ALTER TABLE "arrestations" ADD CONSTRAINT "arrestations_criminalId_fkey" FOREIGN KEY ("criminalId") REFERENCES "criminals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrestations" ADD CONSTRAINT "arrestations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
