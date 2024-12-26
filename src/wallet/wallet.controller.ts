import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { CreateWalletDto } from "./dto/create-wallet.dto";
import { UpdateWalletDto } from "./dto/update-wallet.dto";
import { AuthGuard } from "src/auth/auth.guard";

@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  create(@Body() createWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  @Get('for-user')
  @UseGuards(AuthGuard)
  findWalletsByUser(@Request() req, @Query("type") type){
    return this.walletService.findWalletsByUser(req.user, type)
  }

  @Get()
  findAll() {
    return this.walletService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.walletService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(+id, updateWalletDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.walletService.remove(+id);
  }
}
