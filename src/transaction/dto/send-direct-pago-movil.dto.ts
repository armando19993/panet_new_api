import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class SendDirectPagoMovilDto {
  @IsString()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;
}
