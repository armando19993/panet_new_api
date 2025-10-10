import { Module } from "@nestjs/common";
import { RechargeService } from "./recharge.service";
import { RechargeController } from "./recharge.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from 'multer';
import { extname } from 'path';
import { NotificationService } from "src/notification/notification.service";
import { FlowApiModule } from "src/flow-api/flow-api.module";
import { WhatsappModule } from "src/whatsapp/whatsapp.module";
import { MovementsAccountJuridicModule } from "src/movements-account-juridic/movements-account-juridic.module";

@Module({
  imports: [
    FlowApiModule,
    PrismaModule,
    WhatsappModule,
    MovementsAccountJuridicModule,
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads", // Ruta donde se guardarán los archivos
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          callback(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`
          );
        },
      }),
    }),
  ],
  controllers: [RechargeController],
  providers: [RechargeService, NotificationService],
})
export class RechargeModule {}
