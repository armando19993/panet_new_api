import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateWalletDto } from "./dto/create-wallet.dto";
import { UpdateWalletDto } from "./dto/update-wallet.dto";
import { PrismaService } from "src/prisma/prisma.servise";
import { User, Wallet } from "@prisma/client";

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) { }

  async create(createWalletDto: Wallet) {
    const existingWallet = await this.prisma.wallet.findFirst({
      where: {
        AND: [
          { userId: createWalletDto.userId },
          { countryId: createWalletDto.countryId },
          { type: createWalletDto.type },
        ],
      },
    });

    if (existingWallet) {
      throw new BadRequestException(
        "El usuario ya tiene una wallet de este tipo en este pais"
      );
    }

    const newWallet = await this.prisma.wallet.create({
      data: createWalletDto,
    });

    return newWallet;
  }

  async findWalletsByUser(user, type) {
    const whereClause: any = {
      userId: user.id,
    };

    if (type) {
      whereClause.type = type;
    }

    const data = await this.prisma.wallet.findMany({
      where: whereClause,
      include: {
        country: true,
      },
    });

    return { data, message: "Wallets del Usuario obtenidos con éxito!" };
  }

  async findAll(query) {
    const { userId, type } = query

    const filters: any = {};
    if (userId) {
      filters.userId = userId
    }
    if (type) {
      filters.type = type
    }

    const data = await this.prisma.wallet.findMany({ where: filters, include: { country: true } })

    return { data, message: 'Wallets obtenidos con éxito' }
  }

  findOne(id) {
    return `This action returns a #${id} wallet`;
  }

  update(id: number, updateWalletDto: UpdateWalletDto) {
    return `This action updates a #${id} wallet`;
  }

  remove(id: number) {
    return `This action removes a #${id} wallet`;
  }
}
