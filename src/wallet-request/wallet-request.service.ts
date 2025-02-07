import { Injectable } from '@nestjs/common';
import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { UpdateWalletRequestDto } from './dto/update-wallet-request.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class WalletRequestService {

  constructor(private prisma: PrismaService) { }

  async create(
    createWalletRequestDto,
    user: any,
    documentPaths: {
      front_document?: string;
      back_document?: string;
      selfie_document?: string;
    }
  ) {
    const data = await this.prisma.walletRequest.create({
      data: {
        ...createWalletRequestDto,
        front_document: documentPaths.front_document,
        back_document: documentPaths.back_document,
        selfie_document: documentPaths.selfie_document,
        userId: user.id,
        countryId: createWalletRequestDto.countryId,
      },
    });

    return { data, message: 'Wallet request created successfully' }
  }

  async findAll(query) {
    const { userId, status, startDate, endDate } = query;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const data = await this.prisma.walletRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { data, message: 'Listado de solicitudes obtenidas con exito!' };
  }

  findOne(id: number) {
    return `This action returns a #${id} walletRequest`;
  }

  update(id: number, updateWalletRequestDto: UpdateWalletRequestDto) {
    return `This action updates a #${id} walletRequest`;
  }

  remove(id: number) {
    return `This action removes a #${id} walletRequest`;
  }
}
