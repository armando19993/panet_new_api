import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RateService } from './rate.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';

@Controller('rate')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Post()
  create(@Body() createRateDto: CreateRateDto) {
    return this.rateService.create(createRateDto);
  }

  @Get()
  findAll(@Query() query) {
    return this.rateService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rateService.findOne(+id);
  }

  @Patch('')
  update() {
    return this.rateService.update();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rateService.remove(+id);
  }
}
