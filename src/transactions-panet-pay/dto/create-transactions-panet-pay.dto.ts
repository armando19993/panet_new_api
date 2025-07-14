import { IsDecimal, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTransactionsPanetPayDto {
  @IsNotEmpty()
  @IsString()
  userOriginId: string;

  @IsNotEmpty()
  @IsString()
  userDestinationId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  countryId: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  walletSenderId?: string;

  @IsNotEmpty()
  @IsString()
  walletReceiverId: string;

  @IsOptional()
  @IsString()
  senderId?: string;
}