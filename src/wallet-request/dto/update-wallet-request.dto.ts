import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletRequestDto } from './create-wallet-request.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateWalletRequestDto extends PartialType(CreateWalletRequestDto) {
    @IsNotEmpty()
    status: string
}
