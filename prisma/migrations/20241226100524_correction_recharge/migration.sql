-- CreateEnum
CREATE TYPE "TypeCola" AS ENUM ('RECARGA', 'TRANSACCION');

-- CreateTable
CREATE TABLE "ColaEspera" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "rechargeId" TEXT,
    "transactionIs" TEXT,
    "userId" TEXT NOT NULL,
    "type" "TypeCola" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColaEspera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColaEspera_publicId_key" ON "ColaEspera"("publicId");

-- AddForeignKey
ALTER TABLE "ColaEspera" ADD CONSTRAINT "ColaEspera_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "Recharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColaEspera" ADD CONSTRAINT "ColaEspera_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
