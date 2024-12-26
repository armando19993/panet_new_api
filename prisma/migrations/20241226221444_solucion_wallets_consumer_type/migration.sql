-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "consumer_id_type" DROP NOT NULL,
ALTER COLUMN "consumer_id" DROP NOT NULL;
