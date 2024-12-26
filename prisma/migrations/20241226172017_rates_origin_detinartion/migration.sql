-- AlterTable
ALTER TABLE "Rate" ADD COLUMN     "countryId" TEXT;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
