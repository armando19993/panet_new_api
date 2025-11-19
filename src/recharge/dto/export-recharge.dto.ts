import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from "class-validator";

export class ExportRechargeFilterDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  instrumentIds: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

