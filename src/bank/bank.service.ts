import { Injectable } from "@nestjs/common";
import { CreateBankDto } from "./dto/create-bank.dto";
import { UpdateBankDto } from "./dto/update-bank.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class BankService {
  constructor(private prisma: PrismaService) {}

  async create(createBankDto: CreateBankDto) {
    const data = await this.prisma.bank.create({ data: createBankDto });

    return { data, message: "Banco creado con exito" };
  }

  async findAll(countryId?: string) {
    const data = await this.prisma.bank.findMany({
      where: countryId ? { countryId } : undefined,
    });

    return { data, message: "Bancos encontrados con éxito" };
  }

  async findOne(id: string) {
    const data = await this.prisma.bank.findFirst({
      where: { id },
    });

    return { data, message: "Banco encontrado con exito" };
  }

  async update(id: string, updateBankDto) {
    const data = await this.prisma.bank.update({
      where: { id },
      data: updateBankDto,
    });

    return { data, message: "Banco actualizado con exito" };
  }

  remove(id: string) {
    return `This action removes a #${id} bank`;
  }
}
