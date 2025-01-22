-- AlterTable
ALTER TABLE "Recharge" ADD COLUMN     "clientId" TEXT;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
