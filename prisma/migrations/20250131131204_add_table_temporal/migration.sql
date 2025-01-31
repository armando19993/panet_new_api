-- CreateEnum
CREATE TYPE "StatusTransactionsTemporal" AS ENUM ('CREADA', 'RECHAZADA', 'APROBADA');

-- CreateTable
CREATE TABLE "TransactionTemporal" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "creadorId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "montoOrigen" DECIMAL(10,2) NOT NULL,
    "status" "StatusTransactionsTemporal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rechargeId" TEXT NOT NULL,

    CONSTRAINT "TransactionTemporal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionTemporal_publicId_key" ON "TransactionTemporal"("publicId");

-- AddForeignKey
ALTER TABLE "TransactionTemporal" ADD CONSTRAINT "TransactionTemporal_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "Recharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
