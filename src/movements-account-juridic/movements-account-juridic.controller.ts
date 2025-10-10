import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MovementsAccountJuridicService } from './movements-account-juridic.service';
import { CreateMovementsAccountJuridicDto } from './dto/create-movements-account-juridic.dto';
import { UpdateMovementsAccountJuridicDto } from './dto/update-movements-account-juridic.dto';

@Controller('movements-account-juridic')
export class MovementsAccountJuridicController {
  constructor(private readonly movementsAccountJuridicService: MovementsAccountJuridicService) {}

  @Post()
  create(@Body() createMovementsAccountJuridicDto: CreateMovementsAccountJuridicDto) {
    return this.movementsAccountJuridicService.create(createMovementsAccountJuridicDto);
  }

  @Get()
  findAll(@Query() query: {
    startDate?: string;
    endDate?: string;
    specificDate?: string;
    type?: 'INGRESO' | 'EGRESO';
  }) {
    return this.movementsAccountJuridicService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movementsAccountJuridicService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMovementsAccountJuridicDto: UpdateMovementsAccountJuridicDto) {
    return this.movementsAccountJuridicService.update(id, updateMovementsAccountJuridicDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movementsAccountJuridicService.remove(id);
  }
}
