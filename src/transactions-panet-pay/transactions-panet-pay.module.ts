import { Module } from '@nestjs/common';
import { TransactionsPanetPayService } from './transactions-panet-pay.service';
import { TransactionsPanetPayController } from './transactions-panet-pay.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsPanetPayController],
  providers: [TransactionsPanetPayService, NotificationService],
})
export class TransactionsPanetPayModule {}
