import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletRequestDto } from './create-wallet-request.dto';

export class UpdateWalletRequestDto extends PartialType(CreateWalletRequestDto) {}
