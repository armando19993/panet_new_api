import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('transaction')
@UseGuards(AuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  findAll(@Query() query, @Request() req) {
    return this.transactionService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id) {
    return this.transactionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransactionDto) {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionService.remove(id);
  }

  @Post('notificar')
  @UseInterceptors(FileInterceptor('image'))
  notificar(@Body() data, @UploadedFile() file: Express.Multer.File){
    return this.transactionService.notificar(data, file)
  }

  @Post('procesar-transaction')
  @UseInterceptors(FileInterceptor('comprobante'))
  procesar(@Body() data,  @UploadedFile() file: Express.Multer.File, @Request() req){
    return this.transactionService.procesar(data, file, req.user)
  }

  @Post('transferir')
  transferir(@Body() data){
    return this.transactionService.transferir(data)
  }

  @Get('conciliation')
  getConciliationData(@Query('fechaIni') fechaIni: string, @Query('fechaFin') fechaFin: string) {
    return this.transactionService.getConciliationData(fechaIni, fechaFin);
  }
}
