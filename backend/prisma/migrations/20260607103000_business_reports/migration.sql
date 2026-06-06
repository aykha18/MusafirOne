-- CreateEnum
CREATE TYPE "BusinessReportStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "BusinessReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "status" "BusinessReportStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    CONSTRAINT "BusinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessReport_businessId_idx" ON "BusinessReport"("businessId");

-- CreateIndex
CREATE INDEX "BusinessReport_reporterUserId_idx" ON "BusinessReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "BusinessReport_status_idx" ON "BusinessReport"("status");

-- CreateIndex
CREATE INDEX "BusinessReport_createdAt_idx" ON "BusinessReport"("createdAt");

-- AddForeignKey
ALTER TABLE "BusinessReport" ADD CONSTRAINT "BusinessReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReport" ADD CONSTRAINT "BusinessReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReport" ADD CONSTRAINT "BusinessReport_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

