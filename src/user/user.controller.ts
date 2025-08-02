import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { UpdatePinDto } from './dto/update-pin.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  create(@Body() createUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query('clients') clients) {
    return this.userService.findAll(clients);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @Get('/by-roles/shearch')
  @UseGuards(AuthGuard)
  async getUsersByRoles(@Query('roles') roles) {
    return this.userService.getUsersByRoles(roles);
  }

  @Get('update/password')
  async updatePassword(@Query('user') user, @Query('password') password) {
    console.log(user, password)
    return this.userService.updatePassword(user, password);
  }

  @Get('send/masive/push')
  @UseGuards(AuthGuard)
  async sendMasivePush(@Query() query) {
    return this.userService.sendMasivePush(query)
  }

  @Patch(':id/validate-identity')
  @UseGuards(AuthGuard)
  async validateIdentity(@Param('id') id: string) {
    return this.userService.validateIdentity(id);
  }

  @Patch('update/pin/:id')
  @UseGuards(AuthGuard)
  async updatePin(@Param('id') id: string, @Body() updatePinDto: UpdatePinDto) {
    return this.userService.updatePin(id, updatePinDto);
  }
}
