-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bloqueo_panet_pay" DATE,
ADD COLUMN     "status_panet_pay" BOOLEAN NOT NULL DEFAULT true;
