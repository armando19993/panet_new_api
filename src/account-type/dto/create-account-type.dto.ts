import { IsString, IsUUID } from "class-validator";

export class CreateAccountTypeDto {
  @IsString()
  name: string;

  @IsUUID()
  countryId: string;
}
