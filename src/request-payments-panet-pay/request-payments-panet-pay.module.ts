import { Module } from '@nestjs/common';
import { RequestPaymentsPanetPayService } from './request-payments-panet-pay.service';
import { RequestPaymentsPanetPayController } from './request-payments-panet-pay.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsPanetPayModule } from 'src/transactions-panet-pay/transactions-panet-pay.module';
import { TransactionsPanetPayService } from 'src/transactions-panet-pay/transactions-panet-pay.service';

@Module({
  controllers: [RequestPaymentsPanetPayController],
  providers: [RequestPaymentsPanetPayService],
  imports: [PrismaModule, TransactionsPanetPayModule]
})
export class RequestPaymentsPanetPayModule {}
