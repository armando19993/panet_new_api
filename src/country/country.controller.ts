import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { CountryService } from "./country.service";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { AuthGuard } from "src/auth/auth.guard";

@Controller("country")
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createCountryDto) {
    return this.countryService.create(createCountryDto);
  }

  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.countryService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  update(@Param("id") id: string, @Body() updateCountryDto) {
    return this.countryService.update(id, updateCountryDto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  remove(@Param("id") id: string) {
    return this.countryService.remove(id);
  }
}
