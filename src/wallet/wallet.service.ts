import { BadRequestException, Injectable } from "@nestjs/common";
import { UpdateWalletDto } from "./dto/update-wallet.dto";
import { PrismaService } from "src/prisma/prisma.servise";
import { Wallet } from "@prisma/client";
import { NotificationService } from "src/notification/notification.service";

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificationService
  ) { }

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

  async findWalletsByUser(user, type, userId?: string) {
    const whereClause: any = {
      userId: userId || user.id,
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

    const data = await this.prisma.wallet.findMany({ where: filters, include: { country: true, user: true } })

    return { data, message: 'Wallets obtenidos con éxito' }
  }

  async transfer(user, transferData) {
    const { sourceWalletId, targetWalletId, amount } = transferData;

    const walletSalida = await this.prisma.wallet.findFirst({
      where: {
        id: sourceWalletId,
      },
    });

    if (!walletSalida) {
      throw new BadRequestException("La wallet origen no existe");
    }

    if (walletSalida.balance < amount) {
      throw new BadRequestException("Fondos insuficientes");
    }

    const walletLlegada = await this.prisma.wallet.findFirst({
      where: {
        id: targetWalletId,
      },
    });

    if (!walletLlegada) {
      throw new BadRequestException("La wallet destino no existe");
    }

    await this.prisma.wallet.update({
      where: {
        id: sourceWalletId,
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    await this.prisma.wallet.update({
      where: {
        id: targetWalletId,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    await this.prisma.walletTransactions.create({
      data: {
        amount,
        amount_new: parseFloat(walletSalida.balance.toString()) - amount,
        amount_old: walletSalida.balance,
        wallet: {
          connect: {
            id: walletSalida.id,
          },
        },
        description: "Transferencia entre wallets",
        type: "RETIRO"
      },
    })

    await this.prisma.walletTransactions.create({
      data: {
        amount,
        amount_new: parseFloat(walletLlegada.balance.toString()) + amount,
        amount_old: walletLlegada.balance,
        wallet: {
          connect: {
            id: walletLlegada.id,
          },
        },
        description: "Transferencia entre wallets",
        type: "DEPOSITO"
      },
    })

    return { message: "Transferencia realizada con éxito" };
  }

  async updateBalance(user, id, updateBalance) {
    const data = await this.prisma.wallet.update({ where: { id }, data: { balance: updateBalance.balance } })

    await this.prisma.walletTransactions.create({
      data: {
        amount: updateBalance.balance,
        amount_new: updateBalance.balance,
        amount_old: data.balance,
        wallet: {
          connect: {
            id: data.id,
          },
        },
        description: "Actualización de balance por @" + user.user,
        type: "DEPOSITO"
      }
    })

    return { data, message: 'Balance actualizado con éxito' }
  }

  async findOne(id) {
    const data = await this.prisma.wallet.findUnique({
      where: { id },
      include: { transactions: true, country: true, user: true }
    });

    // Contar transacciones por tipo
    const depositosCount = data.transactions.filter(tx => tx.type === 'DEPOSITO').length;
    const retirosCount = data.transactions.filter(tx => tx.type === 'RETIRO').length;

    return {
      data,
      message: 'Wallet obtenido con éxito',
      transaccionesPorTipo: {
        depositos: depositosCount,
        retiros: retirosCount
      }
    };
  }

  update(id: number, updateWalletDto: UpdateWalletDto) {
    return `This action updates a #${id} wallet`;
  }

  remove(id: number) {
    return `This action removes a #${id} wallet`;
  }

  async toggleStatus(id: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      throw new BadRequestException("Wallet no encontrada");
    }

    // Alternar entre ACTIVO e INACTIVO
    const newStatus = wallet.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    const updatedWallet = await this.prisma.wallet.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      data: updatedWallet,
      message: `Estado de wallet actualizado a ${newStatus}`,
    };
  }

  async getTotalsByCountry() {
    const wallets = await this.prisma.wallet.findMany({
      include: {
        country: true
      }
    });

    const totalsByCountry = {};

    wallets.forEach(wallet => {
      if (!totalsByCountry[wallet.country.id]) {
        totalsByCountry[wallet.country.id] = {
          countryName: wallet.country.name,
          recarga: 0,
          recepcion: 0
        };
      }

      if (wallet.type === 'RECARGA') {
        totalsByCountry[wallet.country.id].recarga += wallet.balance;
      } else if (wallet.type === 'RECEPCION') {
        totalsByCountry[wallet.country.id].recepcion += wallet.balance;
      }
    });

    return {
      data: Object.values(totalsByCountry),
      message: 'Totales por país obtenidos con éxito'
    };
  }
}
