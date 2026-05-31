-- CreateTable
CREATE TABLE "ExchangeFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeFavorite_userId_businessId_key" ON "ExchangeFavorite"("userId", "businessId");

-- CreateIndex
CREATE INDEX "ExchangeFavorite_userId_idx" ON "ExchangeFavorite"("userId");

-- CreateIndex
CREATE INDEX "ExchangeFavorite_businessId_idx" ON "ExchangeFavorite"("businessId");

-- CreateIndex
CREATE INDEX "ExchangeFavorite_createdAt_idx" ON "ExchangeFavorite"("createdAt");

-- AddForeignKey
ALTER TABLE "ExchangeFavorite" ADD CONSTRAINT "ExchangeFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeFavorite" ADD CONSTRAINT "ExchangeFavorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
