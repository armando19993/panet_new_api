-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pin_panet_pay" INTEGER;

-- CreateTable
CREATE TABLE "TransactionsPanetPay" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "countryId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userOriginId" TEXT NOT NULL,
    "userDestinationId" TEXT NOT NULL,
    "senderId" TEXT,
    "walletSenderId" TEXT,
    "walletReceiverId" TEXT NOT NULL,

    CONSTRAINT "TransactionsPanetPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestPaymentsPanetPay" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedUserId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "RequestPaymentsPanetPay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionsPanetPay_publicId_key" ON "TransactionsPanetPay"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestPaymentsPanetPay_publicId_key" ON "RequestPaymentsPanetPay"("publicId");

-- CreateIndex
CREATE INDEX "RequestPaymentsPanetPay_requesterId_idx" ON "RequestPaymentsPanetPay"("requesterId");

-- CreateIndex
CREATE INDEX "RequestPaymentsPanetPay_requestedUserId_idx" ON "RequestPaymentsPanetPay"("requestedUserId");

-- CreateIndex
CREATE INDEX "RequestPaymentsPanetPay_createdAt_idx" ON "RequestPaymentsPanetPay"("createdAt");

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_userOriginId_fkey" FOREIGN KEY ("userOriginId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_userDestinationId_fkey" FOREIGN KEY ("userDestinationId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_walletSenderId_fkey" FOREIGN KEY ("walletSenderId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionsPanetPay" ADD CONSTRAINT "TransactionsPanetPay_walletReceiverId_fkey" FOREIGN KEY ("walletReceiverId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPaymentsPanetPay" ADD CONSTRAINT "RequestPaymentsPanetPay_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPaymentsPanetPay" ADD CONSTRAINT "RequestPaymentsPanetPay_requestedUserId_fkey" FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPaymentsPanetPay" ADD CONSTRAINT "RequestPaymentsPanetPay_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPaymentsPanetPay" ADD CONSTRAINT "RequestPaymentsPanetPay_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "TransactionsPanetPay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
