import { IsOptional, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsOptional()
  pushToken: {
    data: string;
  };
}
