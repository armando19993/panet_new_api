import { IsDecimal, IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class CreateRequestPaymentsPanetPayDto {
  @IsNotEmpty()
  @IsString()
  requesterId: string;

  @IsNotEmpty()
  @IsString()
  requestedUserId: string;

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
  description?: string;

  @IsOptional()
  status?: string;
}