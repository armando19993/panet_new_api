/*
  Warnings:

  - A unique constraint covering the columns `[rechargeId,userId,type]` on the table `ColaEspera` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ColaEspera_rechargeId_userId_type_key" ON "ColaEspera"("rechargeId", "userId", "type");
