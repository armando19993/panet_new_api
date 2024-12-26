/*
  Warnings:

  - A unique constraint covering the columns `[userId,countryId,type]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Wallet_userId_countryId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_countryId_type_key" ON "Wallet"("userId", "countryId", "type");
