ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "hash" TEXT;
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- À exécuter par l'exploitant avec le rôle SQL applicatif réel :
-- REVOKE UPDATE, DELETE ON audit_logs FROM <rôle applicatif>;
