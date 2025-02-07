import { Injectable } from '@nestjs/common';
import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { UpdateWalletRequestDto } from './dto/update-wallet-request.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class WalletRequestService {

  constructor(private prisma: PrismaService) { }

  async create(
    createWalletRequestDto: CreateWalletRequestDto,
    user: any,
    documentPaths: {
      front_document?: string;
      back_document?: string;
      selfie_document?: string;
    }
  ) {
    return this.prisma.walletRequest.create({
      data: {
        ...createWalletRequestDto,
        front_document: documentPaths.front_document,
        back_document: documentPaths.back_document,
        selfie_document: documentPaths.selfie_document,
        userId: user.id,
        countryId: user.countryId,
      },
    });
  }

  findAll() {
    return `This action returns all walletRequest`;
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
