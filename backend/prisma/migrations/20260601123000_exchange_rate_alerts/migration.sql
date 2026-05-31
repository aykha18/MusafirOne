-- CreateTable
CREATE TABLE "ExchangeRateAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "direction" "ExchangeOfferDirection" NOT NULL,
    "targetRate" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),
    CONSTRAINT "ExchangeRateAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateAlert_userId_fromCurrency_toCurrency_direction_targetRate_key" ON "ExchangeRateAlert"("userId", "fromCurrency", "toCurrency", "direction", "targetRate");

-- CreateIndex
CREATE INDEX "ExchangeRateAlert_userId_idx" ON "ExchangeRateAlert"("userId");

-- CreateIndex
CREATE INDEX "ExchangeRateAlert_fromCurrency_toCurrency_idx" ON "ExchangeRateAlert"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRateAlert_isActive_idx" ON "ExchangeRateAlert"("isActive");

-- CreateIndex
CREATE INDEX "ExchangeRateAlert_createdAt_idx" ON "ExchangeRateAlert"("createdAt");

-- AddForeignKey
ALTER TABLE "ExchangeRateAlert" ADD CONSTRAINT "ExchangeRateAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
