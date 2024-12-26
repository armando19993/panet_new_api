-- DropForeignKey
ALTER TABLE "InstrumentsClient" DROP CONSTRAINT "InstrumentsClient_bankId_fkey";

-- AlterTable
ALTER TABLE "InstrumentsClient" ALTER COLUMN "bankId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
