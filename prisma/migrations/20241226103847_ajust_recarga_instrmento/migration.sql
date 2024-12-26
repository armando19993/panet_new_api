/*
  Warnings:

  - You are about to drop the column `accountId` on the `Recharge` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Recharge" DROP CONSTRAINT "Recharge_accountId_fkey";

-- AlterTable
ALTER TABLE "InstrumentsClient" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Recharge" DROP COLUMN "accountId",
ADD COLUMN     "instrumentId" TEXT;

-- DropTable
DROP TABLE "Account";

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentsClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
