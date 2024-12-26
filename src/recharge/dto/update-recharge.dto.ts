import { PartialType } from '@nestjs/mapped-types';
import { CreateRechargeDto } from './create-recharge.dto';

export class UpdateRechargeDto extends PartialType(CreateRechargeDto) {}
