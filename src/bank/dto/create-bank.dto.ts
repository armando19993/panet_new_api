import { IsString, IsUUID } from "class-validator";

export class CreateBankDto {
  @IsString()
  name: string;
  @IsString()
  code: string;
  @IsUUID()
  countryId: string;
}
