import { Injectable } from '@nestjs/common';
import { CreateRequestPaymentsPanetPayDto } from './dto/create-request-payments-panet-pay.dto';
import { UpdateRequestPaymentsPanetPayDto } from './dto/update-request-payments-panet-pay.dto';

@Injectable()
export class RequestPaymentsPanetPayService {
  create(createRequestPaymentsPanetPayDto: CreateRequestPaymentsPanetPayDto) {
    return 'This action adds a new requestPaymentsPanetPay';
  }

  findAll() {
    return `This action returns all requestPaymentsPanetPay`;
  }

  findOne(id: number) {
    return `This action returns a #${id} requestPaymentsPanetPay`;
  }

  update(id: number, updateRequestPaymentsPanetPayDto: UpdateRequestPaymentsPanetPayDto) {
    return `This action updates a #${id} requestPaymentsPanetPay`;
  }

  remove(id: number) {
    return `This action removes a #${id} requestPaymentsPanetPay`;
  }
}
