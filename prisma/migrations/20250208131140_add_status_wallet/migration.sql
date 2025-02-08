-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVO', 'BLOQUEADO', 'INACTIVO');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVO';
