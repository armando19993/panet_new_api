import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ColaEsperaService } from './cola-espera.service';
import { CreateColaEsperaDto } from './dto/create-cola-espera.dto';
import { UpdateColaEsperaDto } from './dto/update-cola-espera.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('cola-espera')
@UseGuards(AuthGuard)
export class ColaEsperaController {
  constructor(private readonly colaEsperaService: ColaEsperaService) {}

  @Post()
  create(@Body() createColaEsperaDto: CreateColaEsperaDto) {
    return this.colaEsperaService.create(createColaEsperaDto);
  }

  @Get()
  findAll(@Query() query) {
    return this.colaEsperaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.colaEsperaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateColaEsperaDto) {
    return this.colaEsperaService.update(id, updateColaEsperaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.colaEsperaService.remove(id);
  }

  @Post("transfer/masive")
  transferMasive(@Body() data){
    return this.colaEsperaService.transferMasive(data)
  }
}
