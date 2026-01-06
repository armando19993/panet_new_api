/*
  Warnings:

  - You are about to alter the column `amount` on the `Rate` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,4)` to `Decimal(10,8)`.
  - You are about to alter the column `montoTasa` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,3)` to `Decimal(10,5)`.

*/
-- AlterTable
ALTER TABLE "Rate" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,8);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "origen_operation" TEXT,
ALTER COLUMN "montoTasa" SET DATA TYPE DECIMAL(10,5);
