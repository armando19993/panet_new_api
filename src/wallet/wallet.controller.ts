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
  Put,
} from "@nestjs/common";
import { Wallet } from "@prisma/client";
import { WalletService } from "./wallet.service";
import { CreateWalletDto } from "./dto/create-wallet.dto";
import { UpdateWalletDto } from "./dto/update-wallet.dto";
import { AuthGuard } from "src/auth/auth.guard";
import { CountryTotal } from "./wallet.service";

@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Post()
  create(@Body() createWalletDto: any) {
    // TODO: Implementar validación/mapeo de DTO a Wallet
    return this.walletService.create(createWalletDto as unknown as Wallet);
  }

  @Get('totals-by-country')
  getTotalsByCountry(): Promise<{ data: CountryTotal[], message: string }> {
    return this.walletService.getTotalsByCountry();
  }

  @Get('for-user')
  @UseGuards(AuthGuard)
  findWalletsByUser(@Request() req, @Query("type") type, @Query("userId") userId?: string) {
    return this.walletService.findWalletsByUser(req.user, type, userId)
  }

  @Get()
  findAll(@Query() query) {
    return this.walletService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.walletService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(+id, updateWalletDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.walletService.remove(+id);
  }

  @Post("transfer")
  @UseGuards(AuthGuard)
  transfer(@Request() req, @Body() transferData) {
    return this.walletService.transfer(req.user, transferData)
  }

  @Put(":id/balance")
  @UseGuards(AuthGuard)
  updateBalance(@Request() req, @Param("id") id: string, @Body() updateBalanceData) {
    return this.walletService.updateBalance(req.user, id, updateBalanceData)
  }

  @Patch(":id/toggle-status")
  @UseGuards(AuthGuard)
  toggleStatus(@Param("id") id: string) {
    return this.walletService.toggleStatus(id)
  }
}
