-- CreateEnum
CREATE TYPE "StatusTransactions" AS ENUM ('CREADA', 'OBSERVADA', 'ANULADA', 'COMPLETADA');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "creadorId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "clienteId" TEXT,
    "instrumentId" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "montoOrigen" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "montoDestino" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "montoTasa" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "monedaOrigen" TEXT NOT NULL,
    "monedaDestino" TEXT NOT NULL,
    "montoComisionPasarela" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "gananciaIntermediario" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "gastosAdicionales" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "gananciaPanet" DECIMAL(10,3) NOT NULL DEFAULT 0.00,
    "nro_referencia" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "observacion" TEXT,
    "status" "StatusTransactions" NOT NULL DEFAULT 'CREADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_publicId_key" ON "Transaction"("publicId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentsClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
