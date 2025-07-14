import { IsDecimal, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRequestPaymentsPanetPayDto {
  @IsNotEmpty()
  @IsString()
  requestedUserId: string;

  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '2' })
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