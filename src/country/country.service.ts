import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

  async create(createCountryDto) {
    const validate = await this.prisma.country.findFirst({
      where: {
        AND: [
          { name: createCountryDto.name },
          { abbreviation: createCountryDto.abbreviation },
        ],
      },
    });

    if (validate) {
      throw new BadRequestException(
        "Ya existe un país con el mismo nombre y la misma abreviatura"
      );
    }

    const newCountry = await this.prisma.country.create({
      data: {
        name: createCountryDto.name,
        abbreviation: createCountryDto.abbreviation,
        currency: createCountryDto.currency,
        profit: createCountryDto.profit,
        ven_profit: createCountryDto.ven_profit,
        especial_profit: createCountryDto.especial_profit,
        rate_purchase: createCountryDto.rate_purchase,
        rate_sales: createCountryDto.rate_sales,
        rate_wholesale: createCountryDto.rate_wholesale,
        status: createCountryDto.status,
        code: createCountryDto.code,
        amount: createCountryDto.amount,
      },
    });

    return {
      module: "Country",
      data: newCountry,
      message: "Pais Creado con exito",
    };
  }

  async findAll() {
    const data = await this.prisma.country.findMany();

    return { module: "Country", data, mesage: "Paises Obtenidos con exito" };
  }

  findOne(id) {
    return `This action returns a #${id} country`;
  }

  async update(id: string, updateCountryDto) {
    const data = await this.prisma.country.update({
      where: {id},
      data: updateCountryDto
    })

    return {data, message: 'Pais Actualizado con exito'}
  }

  remove(id: string) {
    return `This action removes a #${id} country`;
  }
}
