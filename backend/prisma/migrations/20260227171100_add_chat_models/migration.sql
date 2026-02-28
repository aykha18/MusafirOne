-- AlterEnum
ALTER TYPE "ParcelStatus" ADD VALUE 'pending';

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_matchRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_matchRequestId_fkey";

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "parcelRequestId" TEXT,
ALTER COLUMN "matchRequestId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ParcelRequest" ADD COLUMN     "matchInitiatedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "parcelRequestId" TEXT,
ALTER COLUMN "matchRequestId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "matchRequestId" TEXT,
    "parcelRequestId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_user1Id_user2Id_matchRequestId_parcelRequestId_key" ON "Conversation"("user1Id", "user2Id", "matchRequestId", "parcelRequestId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "CurrencyMatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_parcelRequestId_fkey" FOREIGN KEY ("parcelRequestId") REFERENCES "ParcelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "CurrencyMatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_parcelRequestId_fkey" FOREIGN KEY ("parcelRequestId") REFERENCES "ParcelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "CurrencyMatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parcelRequestId_fkey" FOREIGN KEY ("parcelRequestId") REFERENCES "ParcelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
