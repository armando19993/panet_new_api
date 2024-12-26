import { Module } from "@nestjs/common";
import { RechargeService } from "./recharge.service";
import { RechargeController } from "./recharge.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    PrismaModule,
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
  providers: [RechargeService],
})
export class RechargeModule {}
