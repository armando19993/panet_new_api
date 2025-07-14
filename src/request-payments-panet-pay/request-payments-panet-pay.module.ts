import { Module } from '@nestjs/common';
import { RequestPaymentsPanetPayService } from './request-payments-panet-pay.service';
import { RequestPaymentsPanetPayController } from './request-payments-panet-pay.controller';

@Module({
  controllers: [RequestPaymentsPanetPayController],
  providers: [RequestPaymentsPanetPayService],
})
export class RequestPaymentsPanetPayModule {}
