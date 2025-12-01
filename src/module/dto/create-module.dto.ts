import { IsString, IsNotEmpty } from 'class-validator';

export class CreateModuleDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}
