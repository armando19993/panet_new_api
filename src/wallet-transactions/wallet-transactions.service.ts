import { Injectable } from "@nestjs/common";
import { CreateWalletTransactionDto } from "./dto/create-wallet-transaction.dto";
import { UpdateWalletTransactionDto } from "./dto/update-wallet-transaction.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class WalletTransactionsService {
  constructor(private prisma: PrismaService) { }

  async create(createWalletTransactionDto: CreateWalletTransactionDto, user) {
    const data = await this.prisma.wallet.findUnique({ where: { id: createWalletTransactionDto.walletId } })
    if (data) {
      if (createWalletTransactionDto.type == 'DEPOSITO') {
        await this.prisma.wallet.update({ where: { id: data.id }, data: { balance: { increment: createWalletTransactionDto.amount } } })
        await this.prisma.walletTransactions.create({
          data: {
            amount: createWalletTransactionDto.amount,
            amount_old: data.balance,
            amount_new: parseInt(data.balance.toString()) + parseInt(createWalletTransactionDto.amount.toString()),
            description: `Ingreso a balance por concepto: ${createWalletTransactionDto.description} realizado por: ${user.user}`,
            walletId: createWalletTransactionDto.walletId,
            type: 'DEPOSITO'
          }
        })
      }
      if (createWalletTransactionDto.type == 'RETIRO') {
        await this.prisma.wallet.update({ where: { id: data.id }, data: { balance: { decrement: createWalletTransactionDto.amount } } })
        await this.prisma.walletTransactions.create({
          data: {
            amount: createWalletTransactionDto.amount,
            amount_old: data.balance,
            amount_new: parseInt(data.balance.toString()) - parseInt(createWalletTransactionDto.amount.toString()),
            description: `Retiro a balance por concepto: ${createWalletTransactionDto.description} realizado por: ${user.user}`,
            walletId: createWalletTransactionDto.walletId,
            type: 'RETIRO'
          }
        })
      }
      if (createWalletTransactionDto.type == 'AJUSTE') {
        await this.prisma.wallet.update({ where: { id: data.id }, data: { balance: createWalletTransactionDto.amount } })
        await this.prisma.walletTransactions.create({
          data: {
            amount: createWalletTransactionDto.amount,
            amount_old: data.balance,
            amount_new: createWalletTransactionDto.amount,
            description: `Ajuste a balance por concepto: ${createWalletTransactionDto.description} realizado por: ${user.user}`,
            walletId: createWalletTransactionDto.walletId,
            type: 'DEPOSITO'
          }
        })
      }

      return { data, message: 'Gestion de wallet realizado con exito!' }
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
