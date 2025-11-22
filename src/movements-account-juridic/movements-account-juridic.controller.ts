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

  @Get('balance')
  getAccountBalance() {
    return this.movementsAccountJuridicService.getAccountBalance();
  }

  /**
   * Obtiene todos los movimientos bancarios de una fecha específica o rango de fechas.
   * 
   * @param query Parámetros de consulta:
   * - date: Fecha única en formato YYYY-MM-DD (ej: "2025-11-19") - se usa la misma fecha para inicio y fin
   * - startDate: Fecha inicial en formato YYYY-MM-DD para rango
   * - endDate: Fecha final en formato YYYY-MM-DD para rango
   * 
   * @returns Objeto con:
   * - data: Array de todos los movimientos obtenidos
   * - total: Cantidad total de movimientos
   * - fechaIni: Fecha inicial consultada (formato DD/MM/YYYY)
   * - fechaFin: Fecha final consultada (formato DD/MM/YYYY)
   * - type: Tipo de filtro aplicado (si se especificó)
   * 
   * @example
   * // Consultar una fecha específica
   * GET /movements-account-juridic?date=2025-11-19
   * 
   * @example
   * // Consultar un rango de fechas
   * GET /movements-account-juridic?startDate=2025-11-15&endDate=2025-11-19
   * 
   * @example
   * // Consultar una fecha específica filtrando por tipo
   * GET /movements-account-juridic?date=2025-11-19
   * 
   * @example
   * // Consultar rango de fechas filtrando por tipo
   * GET /movements-account-juridic?startDate=2025-11-15&endDate=2025-11-19
   */
  @Get()
  findAll(@Query() query: {
    startDate?: string;
    endDate?: string;
    date?: string;
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
