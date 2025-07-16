import { IsString, Length } from 'class-validator';

export class UpdatePinDto {
  @IsString()
  @Length(4, 4, { message: 'El PIN anterior debe tener 4 dígitos' })
  pin_panet_pay_old: string;

  @IsString()
  @Length(4, 4, { message: 'El nuevo PIN debe tener 4 dígitos' })
  pin_panet_pay: string;
}
