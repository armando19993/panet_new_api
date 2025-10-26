-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('CREADA', 'ENVIADA', 'ERROR');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "rechargeId" TEXT;

-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "phione" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'CREADA',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notifications_publicId_key" ON "Notifications"("publicId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "Recharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
