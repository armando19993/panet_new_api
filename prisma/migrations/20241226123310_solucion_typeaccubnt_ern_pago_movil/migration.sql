-- DropForeignKey
ALTER TABLE "InstrumentsClient" DROP CONSTRAINT "InstrumentsClient_accountTypeId_fkey";

-- AlterTable
ALTER TABLE "InstrumentsClient" ALTER COLUMN "accountTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_accountTypeId_fkey" FOREIGN KEY ("accountTypeId") REFERENCES "AccountType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
