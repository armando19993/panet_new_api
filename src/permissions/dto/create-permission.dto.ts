import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePermissionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    slug: string;

    @IsUUID()
    @IsNotEmpty()
    moduleId: string;
}
