import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { NotificationService } from "src/notification/notification.service";
import { WhatsappModule } from "src/whatsapp/whatsapp.module";

@Module({
  controllers: [AuthController],
  providers: [AuthService, NotificationService],
  imports: [
    PrismaModule,
    WhatsappModule,
    JwtModule.register({
      global: true,
      secret: 'token_prueba',
      signOptions: { expiresIn: "1d" },
    }),
  ],
})
export class AuthModule {}
