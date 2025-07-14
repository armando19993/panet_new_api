import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionsPanetPayDto } from './create-transactions-panet-pay.dto';

export class UpdateTransactionsPanetPayDto extends PartialType(CreateTransactionsPanetPayDto) {}
