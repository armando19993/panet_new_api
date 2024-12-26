-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('RECEPCION', 'RECARGA', 'GANANCIAS');

-- CreateEnum
CREATE TYPE "TypeRecharge" AS ENUM ('AUTOMATIZADO', 'MANUAL');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('DEPOSITO', 'RETIRO');

-- CreateEnum
CREATE TYPE "StatusRecharge" AS ENUM ('CREADA', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "TypesRecharges" AS ENUM ('AUTOMATICA', 'MANUAL');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permissions" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "referredBy" TEXT,
    "profitPercent" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "profit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "ven_profit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "especial_profit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rate_purchase" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rate_sales" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rate_wholesale" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypesDocuments" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypesDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletRequest" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "consumer_id_type" TEXT NOT NULL,
    "consumer_id" TEXT NOT NULL,
    "image_document" TEXT NOT NULL,
    "document_state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "consumer_id_type" TEXT NOT NULL,
    "consumer_id" TEXT NOT NULL,
    "type" "WalletType" NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "userId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransactions" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amount_old" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amount_new" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "type" "TypeTransaction" NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gastos" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "description" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibroDiario" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "debe" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "haber" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gastoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibroDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "intermediaryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentsClient" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "countryId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "document" TEXT,
    "holder" TEXT NOT NULL,
    "accountTypeId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "InstrumentsClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recharge" (
    "id" TEXT NOT NULL,
    "publicId" SERIAL NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TypeRecharge" NOT NULL,
    "status" "StatusRecharge" NOT NULL,
    "comprobante" TEXT,
    "comentario" TEXT,
    "nro_referencia" TEXT NOT NULL,
    "fecha_comprobante" DATE NOT NULL,
    "pasarela_response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionsToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissionsToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_publicId_key" ON "Role"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Module_publicId_key" ON "Module"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_publicId_key" ON "Permissions"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_user_key" ON "User"("user");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_publicId_key" ON "Country"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_publicId_key" ON "Bank"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_publicId_key" ON "AccountType"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "TypesDocuments_publicId_key" ON "TypesDocuments"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletRequest_publicId_key" ON "WalletRequest"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_publicId_key" ON "Wallet"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_countryId_key" ON "Wallet"("userId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransactions_publicId_key" ON "WalletTransactions"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Gastos_publicId_key" ON "Gastos"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "LibroDiario_publicId_key" ON "LibroDiario"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_publicId_key" ON "Client"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentsClient_publicId_key" ON "InstrumentsClient"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Recharge_publicId_key" ON "Recharge"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Recharge_nro_referencia_key" ON "Recharge"("nro_referencia");

-- CreateIndex
CREATE INDEX "_PermissionsToRole_B_index" ON "_PermissionsToRole"("B");

-- AddForeignKey
ALTER TABLE "Permissions" ADD CONSTRAINT "Permissions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bank" ADD CONSTRAINT "Bank_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountType" ADD CONSTRAINT "AccountType_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypesDocuments" ADD CONSTRAINT "TypesDocuments_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletRequest" ADD CONSTRAINT "WalletRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletRequest" ADD CONSTRAINT "WalletRequest_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransactions" ADD CONSTRAINT "WalletTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gastos" ADD CONSTRAINT "Gastos_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibroDiario" ADD CONSTRAINT "LibroDiario_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gastos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_accountTypeId_fkey" FOREIGN KEY ("accountTypeId") REFERENCES "AccountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentsClient" ADD CONSTRAINT "InstrumentsClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recharge" ADD CONSTRAINT "Recharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionsToRole" ADD CONSTRAINT "_PermissionsToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionsToRole" ADD CONSTRAINT "_PermissionsToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
