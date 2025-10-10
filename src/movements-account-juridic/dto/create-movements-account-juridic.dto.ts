import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMovementsAccountJuridicDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsDecimal()
  amount: string;

  @IsOptional()
  @IsDecimal()
  amount_account?: string;

  @IsEnum(['INGRESO', 'EGRESO'])
  type: 'INGRESO' | 'EGRESO';

  @IsOptional()
  @IsString()
  description?: string;
}
