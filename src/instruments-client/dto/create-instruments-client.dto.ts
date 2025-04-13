import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsUUID,
  IsNumber,
} from 'class-validator';

export enum TypesInstrumens {
  PAGO_MOVIL = 'PAGO_MOVIL',
  CUENTA_BANCARIA = 'CUENTA_BANCARIA',
  CUENTA_DIGITAL = 'CUENTA_DIGITAL',
  BILLETERA_MOVIL = 'BILLETERA_MOVIL',
}

export enum UseInstruments {
  CLIENT = 'CLIENT',
  PANET = 'PANET',
}

export class CreateInstrumentsClientDto {
  @IsEnum(TypesInstrumens)
  @IsNotEmpty()
  typeInstrument: TypesInstrumens;

  @IsEnum(UseInstruments)
  @IsOptional()
  useInstruments?: UseInstruments;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsNotEmpty()
  document?: string;

  @IsString()
  @IsNotEmpty()
  holder: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsOptional()
  @IsUUID()
  bankId?: string;

  @IsOptional()
  @IsUUID()
  accountTypeId?: string;

  @IsUUID()
  countryId: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @IsOptional()
  profit: number

  @IsOptional()
  @IsString()
  @IsOptional()
  accountNumberCCI: string

  constructor(partial: Partial<CreateInstrumentsClientDto>) {
    Object.assign(this, partial);
  }
}
