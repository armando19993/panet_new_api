import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RequestPaymentsPanetPayService } from './request-payments-panet-pay.service';
import { CreateRequestPaymentsPanetPayDto } from './dto/create-request-payments-panet-pay.dto';
import { UpdateRequestPaymentsPanetPayDto } from './dto/update-request-payments-panet-pay.dto';

@Controller('request-payments-panet-pay')
export class RequestPaymentsPanetPayController {
  constructor(private readonly requestPaymentsPanetPayService: RequestPaymentsPanetPayService) {}

  @Post()
  create(@Body() createRequestPaymentsPanetPayDto: CreateRequestPaymentsPanetPayDto) {
    return this.requestPaymentsPanetPayService.create(createRequestPaymentsPanetPayDto);
  }

  @Get(':userId')
  findAll(@Param('userId') userId: string) {
    return this.requestPaymentsPanetPayService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestPaymentsPanetPayService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRequestPaymentsPanetPayDto: UpdateRequestPaymentsPanetPayDto) {
    return this.requestPaymentsPanetPayService.update(id, updateRequestPaymentsPanetPayDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestPaymentsPanetPayService.remove(id);
  }
}
