import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTransactionDto {
    @IsUUID()
    creadorId: string

    @IsUUID()
    walletId: string

    @IsUUID()
    rateId: string

    @IsUUID()
    @IsOptional()
    clienteId: string

    @IsUUID()
    instrumentId: string

    @IsUUID()
    origenId: string

    @IsUUID()
    destinoId: string

    @IsNumber()
    amount: number

    @IsOptional()
    @IsString()
    @IsIn(['YAPE', 'PLIN'])
    typeTransaction?: string
}
