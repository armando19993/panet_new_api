-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "despachadorId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_despachadorId_fkey" FOREIGN KEY ("despachadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
