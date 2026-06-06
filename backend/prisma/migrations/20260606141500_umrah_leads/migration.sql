-- CreateTable
CREATE TABLE "UmrahLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UmrahLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UmrahLead_userId_idx" ON "UmrahLead"("userId");

-- CreateIndex
CREATE INDEX "UmrahLead_businessId_idx" ON "UmrahLead"("businessId");

-- CreateIndex
CREATE INDEX "UmrahLead_createdAt_idx" ON "UmrahLead"("createdAt");

-- AddForeignKey
ALTER TABLE "UmrahLead" ADD CONSTRAINT "UmrahLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmrahLead" ADD CONSTRAINT "UmrahLead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
