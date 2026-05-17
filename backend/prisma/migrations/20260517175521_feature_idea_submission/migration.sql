-- AlterTable
ALTER TABLE "FeatureIdea" ADD COLUMN     "submittedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "FeatureIdea_submittedByUserId_idx" ON "FeatureIdea"("submittedByUserId");

-- AddForeignKey
ALTER TABLE "FeatureIdea" ADD CONSTRAINT "FeatureIdea_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
