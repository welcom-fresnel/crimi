ALTER TABLE "criminals"
  ADD COLUMN "personSituation" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "offenseState" TEXT NOT NULL DEFAULT 'UNDER_INVESTIGATION';

CREATE TABLE "procedures" (
  "id" TEXT NOT NULL,
  "criminalId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "summary" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "decisions" (
  "id" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedById" TEXT NOT NULL,
  CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "peines" (
  "id" TEXT NOT NULL,
  "decisionId" TEXT NOT NULL,
  "nature" TEXT NOT NULL,
  "durationDays" INTEGER,
  "notes" TEXT,
  CONSTRAINT "peines_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "validations" (
  "id" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedById" TEXT NOT NULL,
  "reviewerId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reason" TEXT,
  CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "dossier_versions" (
  "id" TEXT NOT NULL,
  "criminalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dossier_versions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "demandes" (
  "id" TEXT NOT NULL,
  "procedureId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "reviewerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "reason" TEXT,
  CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "resultats_publies" (
  "id" TEXT NOT NULL,
  "demandeId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "publishedById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resultats_publies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "procedures_reference_key" ON "procedures"("reference");
CREATE INDEX "procedures_criminalId_idx" ON "procedures"("criminalId");
CREATE INDEX "decisions_procedureId_idx" ON "decisions"("procedureId");
CREATE UNIQUE INDEX "peines_decisionId_key" ON "peines"("decisionId");
CREATE INDEX "validations_procedureId_status_idx" ON "validations"("procedureId", "status");
CREATE UNIQUE INDEX "dossier_versions_criminalId_version_key" ON "dossier_versions"("criminalId", "version");
CREATE INDEX "demandes_procedureId_status_idx" ON "demandes"("procedureId", "status");
CREATE UNIQUE INDEX "resultats_publies_demandeId_key" ON "resultats_publies"("demandeId");
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_criminalId_fkey" FOREIGN KEY ("criminalId") REFERENCES "criminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "peines" ADD CONSTRAINT "peines_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "validations" ADD CONSTRAINT "validations_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "validations" ADD CONSTRAINT "validations_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "validations" ADD CONSTRAINT "validations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_criminalId_fkey" FOREIGN KEY ("criminalId") REFERENCES "criminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dossier_versions" ADD CONSTRAINT "dossier_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resultats_publies" ADD CONSTRAINT "resultats_publies_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resultats_publies" ADD CONSTRAINT "resultats_publies_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
