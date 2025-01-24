import { IsNotEmpty } from "class-validator";

export class CreateRechargeDto {
    @IsNotEmpty()
    countryCode: string;
    @IsNotEmpty()
    amount: string;
    @IsNotEmpty()
    walletId: string;
}
