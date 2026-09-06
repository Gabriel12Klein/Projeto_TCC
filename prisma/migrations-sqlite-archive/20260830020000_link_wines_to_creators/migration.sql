ALTER TABLE "Wine" ADD COLUMN "createdById" TEXT;
CREATE INDEX "Wine_createdById_idx" ON "Wine"("createdById");
