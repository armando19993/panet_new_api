import { IsArray, IsUUID } from 'class-validator';

export class UpdateUserRoleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  roles: string[];
}
