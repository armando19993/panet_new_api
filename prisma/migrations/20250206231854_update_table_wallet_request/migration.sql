/*
  Warnings:

  - You are about to drop the column `document_state` on the `WalletRequest` table. All the data in the column will be lost.
  - You are about to drop the column `image_document` on the `WalletRequest` table. All the data in the column will be lost.
  - Added the required column `back_document` to the `WalletRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `front_document` to the `WalletRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_document` to the `WalletRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selfie_document` to the `WalletRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WalletState" AS ENUM ('APROBADO', 'RECHAZADO', 'ENREVISION');

-- AlterTable
ALTER TABLE "WalletRequest" DROP COLUMN "document_state",
DROP COLUMN "image_document",
ADD COLUMN     "back_document" TEXT NOT NULL,
ADD COLUMN     "front_document" TEXT NOT NULL,
ADD COLUMN     "name_document" TEXT NOT NULL,
ADD COLUMN     "selfie_document" TEXT NOT NULL,
ADD COLUMN     "wallet_state" "WalletState" NOT NULL DEFAULT 'ENREVISION';
