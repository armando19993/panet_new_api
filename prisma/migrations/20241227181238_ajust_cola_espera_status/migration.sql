/*
  Warnings:

  - Added the required column `status` to the `ColaEspera` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "STATUS_COLA" AS ENUM ('INICIADA', 'CERRADA');

-- AlterTable
ALTER TABLE "ColaEspera" ADD COLUMN     "status" "STATUS_COLA" NOT NULL;
