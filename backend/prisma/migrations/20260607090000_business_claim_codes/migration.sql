-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "claimCodeHash" TEXT;
ALTER TABLE "Business" ADD COLUMN     "claimCodeIssuedAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN     "claimCodeConsumedAt" TIMESTAMP(3);

