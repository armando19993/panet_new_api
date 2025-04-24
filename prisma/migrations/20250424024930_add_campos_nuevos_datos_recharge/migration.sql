-- AlterTable
ALTER TABLE "Recharge" ADD COLUMN     "amount_comision" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "amount_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "pasarela" TEXT DEFAULT 'Manual';
