import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsUUID,
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
  @IsOptional()
  document?: string;

  @IsString()
  @IsNotEmpty()
  holder: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsUUID()
  @IsOptional()
  bankId?: string;

  @IsUUID()
  @IsNotEmpty()
  accountTypeId: string;

  @IsUUID()
  countryId: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  constructor(partial: Partial<CreateInstrumentsClientDto>) {
    Object.assign(this, partial);
  }
}
