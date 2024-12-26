import { IsOptional, IsString } from "class-validator";

export class CreateClientDto {
  @IsString()
  name;

  @IsString()
  document;

  @IsString()
  phone;

  @IsString()
  @IsOptional()
  email;
}
