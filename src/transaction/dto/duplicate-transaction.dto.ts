import { IsNumber, IsString, IsUUID } from "class-validator";

export class DuplicateTransactionDto {
    @IsNumber()
    publicId: number;

    @IsUUID()
    instrumentId: string;
}
