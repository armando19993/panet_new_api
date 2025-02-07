import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateWalletRequestDto {
    @IsString()
    @IsNotEmpty()
    consumer_id_type: string;

    @IsString()
    @IsNotEmpty()
    consumer_id: string;

    @IsString()
    @IsNotEmpty()
    name_document: string;

    @IsNotEmpty()
    front_document: Express.Multer.File;

    @IsNotEmpty()
    back_document: Express.Multer.File;

    @IsNotEmpty()
    selfie_document: Express.Multer.File;
}