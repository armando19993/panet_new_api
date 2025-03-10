import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { WalletTransactionsService } from "./wallet-transactions.service";
import { CreateWalletTransactionDto } from "./dto/create-wallet-transaction.dto";
import { UpdateWalletTransactionDto } from "./dto/update-wallet-transaction.dto";
import { AuthGuard } from "src/auth/auth.guard";

@Controller("wallet-transactions")
@UseGuards(AuthGuard)
export class WalletTransactionsController {
  constructor(
    private readonly walletTransactionsService: WalletTransactionsService
  ) { }

  @Post()
  create(@Body() createWalletTransactionDto: CreateWalletTransactionDto, @Request() req) {
    return this.walletTransactionsService.create(createWalletTransactionDto, req.user);
  }

  @Get()
  findAll(@Query("walletId") walletId) {
    return this.walletTransactionsService.findAll(walletId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.walletTransactionsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateWalletTransactionDto: UpdateWalletTransactionDto
  ) {
    return this.walletTransactionsService.update(
      +id,
      updateWalletTransactionDto
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.walletTransactionsService.remove(+id);
  }
}
