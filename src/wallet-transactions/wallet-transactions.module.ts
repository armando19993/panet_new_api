import { Module } from "@nestjs/common";
import { WalletTransactionsService } from "./wallet-transactions.service";
import { WalletTransactionsController } from "./wallet-transactions.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WalletTransactionsController],
  providers: [WalletTransactionsService],
})
export class WalletTransactionsModule {}
