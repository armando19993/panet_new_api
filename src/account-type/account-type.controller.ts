import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AccountTypeService } from './account-type.service';
import { CreateAccountTypeDto } from './dto/create-account-type.dto';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('account-type')
@UseGuards(AuthGuard)
export class AccountTypeController {
  constructor(private readonly accountTypeService: AccountTypeService) {}

  @Post()
  create(@Body() createAccountTypeDto: CreateAccountTypeDto) {
    return this.accountTypeService.create(createAccountTypeDto);
  }

  @Get()
  findAll(@Query("countryId") countryId?: string) {
    return this.accountTypeService.findAll(countryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountTypeDto: UpdateAccountTypeDto) {
    return this.accountTypeService.update(+id, updateAccountTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountTypeService.remove(+id);
  }
}
