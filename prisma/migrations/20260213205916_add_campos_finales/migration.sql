/*
  Warnings:

  - You are about to drop the column `rechargeId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `montoTasa` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Decimal(10,5)`.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_rechargeId_fkey";

-- AlterTable
ALTER TABLE "Recharge" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "rechargeId",
ADD COLUMN     "origen_operation" TEXT,
ALTER COLUMN "montoTasa" SET DATA TYPE DECIMAL(10,5);

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
