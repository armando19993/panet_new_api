/*
  Warnings:

  - Added the required column `typeInstrument` to the `InstrumentsClient` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TypesInstrumens" AS ENUM ('PAGO_MOVIL', 'CUENTA_BANCARIA', 'CUENTA_DIGITAL', 'BILLETERA_MOVIL');

-- CreateEnum
CREATE TYPE "USE_INSTRUMENTS" AS ENUM ('PANET', 'CLIENT');

-- AlterTable
ALTER TABLE "InstrumentsClient" ADD COLUMN     "typeInstrument" "TypesInstrumens" NOT NULL,
ADD COLUMN     "useInstruments" "USE_INSTRUMENTS" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_publicId_key" ON "Account"("publicId");
