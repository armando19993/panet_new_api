-- AlterTable
ALTER TABLE "Recharge" ADD COLUMN     "accountId" TEXT;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
