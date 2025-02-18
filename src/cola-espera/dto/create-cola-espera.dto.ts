import { IsString, IsUUID } from "class-validator";

export class CreateColaEsperaDto {
    @IsUUID()
    despachadorId: string

    @IsUUID()
    transactionId: string

    @IsString()
    type: string
}
