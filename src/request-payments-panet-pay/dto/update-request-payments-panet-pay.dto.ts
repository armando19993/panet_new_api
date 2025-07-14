import { PartialType } from '@nestjs/mapped-types';
import { CreateRequestPaymentsPanetPayDto } from './create-request-payments-panet-pay.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRequestPaymentsPanetPayDto extends PartialType(CreateRequestPaymentsPanetPayDto) {
  @IsOptional()
  status?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}