/*
  Warnings:

  - You are about to drop the column `transactionIs` on the `ColaEspera` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ColaEspera" DROP COLUMN "transactionIs",
ADD COLUMN     "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "ColaEspera" ADD CONSTRAINT "ColaEspera_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
