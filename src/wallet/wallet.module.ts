import { Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { NotificationService } from "src/notification/notification.service";

@Module({
  controllers: [WalletController],
  providers: [WalletService, NotificationService],
  imports: [PrismaModule],
})
export class WalletModule {}
