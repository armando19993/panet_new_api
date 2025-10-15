import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('user-role')
@UseGuards(AuthGuard)
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Post()
  create(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRoleService.create(createUserRoleDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.userRoleService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userRoleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') userId: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.userRoleService.update(userId, updateUserRoleDto);
  }

  @Delete(':userId/:roleId')
  remove(@Param('userId') userId: string, @Param("roleId") roleId: string) {
    return this.userRoleService.remove(userId, roleId);
  }
}
