import { Injectable } from "@nestjs/common";
import { CreateWalletTransactionDto } from "./dto/create-wallet-transaction.dto";
import { UpdateWalletTransactionDto } from "./dto/update-wallet-transaction.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class WalletTransactionsService {
  constructor(private prisma: PrismaService) { }

  async create(createWalletTransactionDto: CreateWalletTransactionDto) {
    const data = await this.prisma.wallet.findUnique({ where: { id: createWalletTransactionDto.walletId } })
    if (data) {
      if (createWalletTransactionDto.type === 'DEPOSITO') await this.prisma.wallet.update({ where: { id: data.id }, data: { balance: { increment: createWalletTransactionDto.amount } } })
      if (createWalletTransactionDto.type === 'RETIRO') await this.prisma.wallet.update({ where: { id: data.id }, data: { balance: { decrement: createWalletTransactionDto.amount } } })
    }
  }

  async findAll(walletId) {
    const data = await this.prisma.walletTransactions.findMany({
      where: {
        walletId,
      },
    });

    return {
      data,
      message: "Listado de Transacciones del wallet obtenidasd correctamente",
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} walletTransaction`;
  }

  update(id: number, updateWalletTransactionDto: UpdateWalletTransactionDto) {
    return `This action updates a #${id} walletTransaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} walletTransaction`;
  }
}
