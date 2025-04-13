import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { InstrumentsClientService } from './instruments-client.service';
import { CreateInstrumentsClientDto } from './dto/create-instruments-client.dto';
import { UpdateInstrumentsClientDto } from './dto/update-instruments-client.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('instruments-client')
@UseGuards(AuthGuard)
export class InstrumentsClientController {
  constructor(private readonly instrumentsClientService: InstrumentsClientService) {}

  @Post()
  create(@Body() createInstrumentsClientDto: CreateInstrumentsClientDto) {
    return this.instrumentsClientService.create(createInstrumentsClientDto);
  }

  @Get()
  findAll(@Query() query) {
    const { clientId, userId, bankId, countryId, accountTypeId, useInstruments, status } = query;
    return this.instrumentsClientService.findAll(clientId, userId, bankId, countryId, accountTypeId, useInstruments, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instrumentsClientService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInstrumentsClientDto: UpdateInstrumentsClientDto) {
    return this.instrumentsClientService.update(id, updateInstrumentsClientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.instrumentsClientService.remove(id);
  }
}
