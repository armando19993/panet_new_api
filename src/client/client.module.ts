import { Module } from "@nestjs/common";
import { ClientService } from "./client.service";
import { ClientController } from "./client.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { TelegramModule } from "src/telegram/telegram.module";

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
