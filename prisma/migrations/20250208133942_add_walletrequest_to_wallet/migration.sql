-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "walletRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_walletRequestId_fkey" FOREIGN KEY ("walletRequestId") REFERENCES "WalletRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
