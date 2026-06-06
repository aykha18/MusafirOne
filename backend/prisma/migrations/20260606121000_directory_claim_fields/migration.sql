-- CreateEnum
CREATE TYPE "BusinessClaimStatus" AS ENUM ('unclaimed', 'claim_requested', 'claimed', 'claim_rejected');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('manual', 'api', 'partner', 'other');

-- AlterTable
ALTER TABLE "Business"
ADD COLUMN     "claimStatus" "BusinessClaimStatus" NOT NULL DEFAULT 'unclaimed',
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "claimedByUserId" TEXT,
ADD COLUMN     "sourceType" "ImportSourceType",
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Business_claimStatus_idx" ON "Business"("claimStatus");

-- CreateIndex
CREATE INDEX "Business_importBatchId_idx" ON "Business"("importBatchId");
