import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";

export class CreateWalletTransactionDto {
    @IsUUID()
    @IsNotEmpty()
    walletId: string

    @IsNumber()
    @IsNotEmpty()
    amount: number

    @IsString()
    @IsNotEmpty()
    description: string

    @IsString()
    @IsNotEmpty()
    type: string
}
