-- CreateEnum
CREATE TYPE "TypeMovement" AS ENUM ('INGRESO', 'EGRESO');

-- CreateTable
CREATE TABLE "MovementsAccountJuridic" (
    "id" TEXT NOT NULL,
    "date" DATE,
    "amount" DECIMAL(10,2) NOT NULL,
    "amount_account" DECIMAL(10,2) NOT NULL,
    "type" "TypeMovement" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementsAccountJuridic_pkey" PRIMARY KEY ("id")
);
