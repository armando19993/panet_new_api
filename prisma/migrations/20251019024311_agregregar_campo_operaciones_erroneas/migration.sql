-- AlterEnum
ALTER TYPE "StatusTransactions" ADD VALUE 'ERROR';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "errorResponse" JSONB;
