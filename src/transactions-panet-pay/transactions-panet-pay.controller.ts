import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TransactionsPanetPayService } from './transactions-panet-pay.service';
import { CreateTransactionsPanetPayDto } from './dto/create-transactions-panet-pay.dto';
import { UpdateTransactionsPanetPayDto } from './dto/update-transactions-panet-pay.dto';

@Controller('transactions-panet-pay')
export class TransactionsPanetPayController {
  constructor(private readonly transactionsPanetPayService: TransactionsPanetPayService) {}

  @Get('obtener-usuario-wallets')
  obtenerUsuarioWallets(@Query("") query) {
    return this.transactionsPanetPayService.obtenerUsuarioWallets(query);
  }


  @Post()
  create(@Body() createTransactionsPanetPayDto: CreateTransactionsPanetPayDto) {
    return this.transactionsPanetPayService.create(createTransactionsPanetPayDto);
  }

  @Get()
  findAll(@Query() query) {
    return this.transactionsPanetPayService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsPanetPayService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransactionsPanetPayDto: UpdateTransactionsPanetPayDto) {
    return this.transactionsPanetPayService.update(+id, updateTransactionsPanetPayDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsPanetPayService.remove(+id);
  }
}
