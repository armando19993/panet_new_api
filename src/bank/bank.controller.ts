import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BankService } from "./bank.service";
import { CreateBankDto } from "./dto/create-bank.dto";
import { UpdateBankDto } from "./dto/update-bank.dto";
import { AuthGuard } from "src/auth/auth.guard";

@Controller("bank")
@UseGuards(AuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  create(@Body() createBankDto: CreateBankDto) {
    return this.bankService.create(createBankDto);
  }

  @Get()
  findAll(@Query("countryId") countryId?: string) {
    return this.bankService.findAll(countryId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.bankService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateBankDto) {
    return this.bankService.update(id, updateBankDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.bankService.remove(id);
  }
}
