import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { MovementsAccountJuridicModule } from 'src/movements-account-juridic/movements-account-juridic.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    MovementsAccountJuridicModule,
    MulterModule.register({
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          callback(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`
          );
        },
      }),
    })
  ],
  controllers: [TransactionController],
  providers: [TransactionService, NotificationService],
})
export class TransactionModule { }
