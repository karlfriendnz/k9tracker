-- AlterTable
ALTER TABLE "packages" ADD COLUMN "defaultSessionFormId" TEXT;

-- CreateIndex
CREATE INDEX "packages_defaultSessionFormId_idx" ON "packages"("defaultSessionFormId");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_defaultSessionFormId_fkey" FOREIGN KEY ("defaultSessionFormId") REFERENCES "session_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
