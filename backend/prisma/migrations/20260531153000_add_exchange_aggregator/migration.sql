-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('exchange', 'umrah');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'active', 'rejected');

-- CreateEnum
CREATE TYPE "ExchangeOfferDirection" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "ExchangeLeadChannel" AS ENUM ('call', 'whatsapp', 'directions', 'share', 'other');

-- CreateEnum
CREATE TYPE "ExchangeConfirmationStatus" AS ENUM ('user_confirmed', 'business_confirmed', 'disputed');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "type" "BusinessType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'pending',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessBranch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timeZone" TEXT,
    "hoursJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeOffer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "direction" "ExchangeOfferDirection" NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "minAmount" DECIMAL(65,30),
    "maxAmount" DECIMAL(65,30),
    "feeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "channel" "ExchangeLeadChannel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeConfirmation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "offerId" TEXT,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "rateObserved" DECIMAL(65,30),
    "status" "ExchangeConfirmationStatus" NOT NULL DEFAULT 'user_confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "confirmationId" TEXT,
    "rateFairnessScore" INTEGER NOT NULL,
    "serviceScore" INTEGER NOT NULL,
    "speedScore" INTEGER NOT NULL,
    "comment" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE INDEX "Business_type_idx" ON "Business"("type");

-- CreateIndex
CREATE INDEX "Business_ownerUserId_idx" ON "Business"("ownerUserId");

-- CreateIndex
CREATE INDEX "BusinessBranch_businessId_idx" ON "BusinessBranch"("businessId");

-- CreateIndex
CREATE INDEX "BusinessBranch_city_idx" ON "BusinessBranch"("city");

-- CreateIndex
CREATE INDEX "ExchangeOffer_branchId_idx" ON "ExchangeOffer"("branchId");

-- CreateIndex
CREATE INDEX "ExchangeOffer_fromCurrency_toCurrency_idx" ON "ExchangeOffer"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeOffer_branchId_fromCurrency_toCurrency_direction_key" ON "ExchangeOffer"("branchId", "fromCurrency", "toCurrency", "direction");

-- CreateIndex
CREATE INDEX "ExchangeLead_userId_idx" ON "ExchangeLead"("userId");

-- CreateIndex
CREATE INDEX "ExchangeLead_branchId_idx" ON "ExchangeLead"("branchId");

-- CreateIndex
CREATE INDEX "ExchangeLead_createdAt_idx" ON "ExchangeLead"("createdAt");

-- CreateIndex
CREATE INDEX "ExchangeConfirmation_userId_idx" ON "ExchangeConfirmation"("userId");

-- CreateIndex
CREATE INDEX "ExchangeConfirmation_branchId_idx" ON "ExchangeConfirmation"("branchId");

-- CreateIndex
CREATE INDEX "ExchangeConfirmation_offerId_idx" ON "ExchangeConfirmation"("offerId");

-- CreateIndex
CREATE INDEX "ExchangeConfirmation_status_idx" ON "ExchangeConfirmation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessReview_confirmationId_key" ON "BusinessReview"("confirmationId");

-- CreateIndex
CREATE INDEX "BusinessReview_userId_idx" ON "BusinessReview"("userId");

-- CreateIndex
CREATE INDEX "BusinessReview_businessId_idx" ON "BusinessReview"("businessId");

-- CreateIndex
CREATE INDEX "BusinessReview_branchId_idx" ON "BusinessReview"("branchId");

-- CreateIndex
CREATE INDEX "BusinessReview_createdAt_idx" ON "BusinessReview"("createdAt");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessBranch" ADD CONSTRAINT "BusinessBranch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOffer" ADD CONSTRAINT "ExchangeOffer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BusinessBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeLead" ADD CONSTRAINT "ExchangeLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeLead" ADD CONSTRAINT "ExchangeLead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BusinessBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConfirmation" ADD CONSTRAINT "ExchangeConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConfirmation" ADD CONSTRAINT "ExchangeConfirmation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BusinessBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeConfirmation" ADD CONSTRAINT "ExchangeConfirmation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExchangeOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReview" ADD CONSTRAINT "BusinessReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReview" ADD CONSTRAINT "BusinessReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReview" ADD CONSTRAINT "BusinessReview_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BusinessBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessReview" ADD CONSTRAINT "BusinessReview_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "ExchangeConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
