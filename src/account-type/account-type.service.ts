import { Injectable } from "@nestjs/common";
import { CreateAccountTypeDto } from "./dto/create-account-type.dto";
import { UpdateAccountTypeDto } from "./dto/update-account-type.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class AccountTypeService {
  constructor(private prisma: PrismaService) {}

  async create(createAccountTypeDto: CreateAccountTypeDto) {
    const data = await this.prisma.accountType.create({
      data: createAccountTypeDto,
    });

    return { data, message: "Tipo de cuenta creado con exito" };
  }

  async findAll(countryId?: string) {
    const data = await this.prisma.accountType.findMany({
      where: countryId ? { countryId } : undefined,
    });

    return { data, message: "Tipos de Cuentas encontrados con éxito" };
  }

  findOne(id: number) {
    return `This action returns a #${id} accountType`;
  }

  update(id: number, updateAccountTypeDto: UpdateAccountTypeDto) {
    return `This action updates a #${id} accountType`;
  }

  remove(id: number) {
    return `This action removes a #${id} accountType`;
  }
}
