/*
  Warnings:

  - A unique constraint covering the columns `[transactionId,userId,type]` on the table `ColaEspera` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ColaEspera_transactionId_userId_type_key" ON "ColaEspera"("transactionId", "userId", "type");
