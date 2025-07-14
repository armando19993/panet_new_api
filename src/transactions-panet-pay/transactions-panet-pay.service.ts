import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionsPanetPayDto } from './dto/create-transactions-panet-pay.dto';
import { UpdateTransactionsPanetPayDto } from './dto/update-transactions-panet-pay.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import { NotificationService } from 'src/notification/notification.service';
import { FlowApiService } from 'src/flow-api/flow-api.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';

@Injectable()
export class TransactionsPanetPayService {

  constructor(
    private prisma: PrismaService,
    private notification: NotificationService
  ) { }

  async create(createTransactionsPanetPayDto: CreateTransactionsPanetPayDto) {
    const { userOriginId, amount, countryId, walletSenderId, senderId, currency, userDestinationId } = createTransactionsPanetPayDto;

    const userOrigin = await this.prisma.user.findFirst({
      where: {
        id: userOriginId
      }
    });


    const walletSender = await this.prisma.wallet.findFirst({
      where: {
        id: walletSenderId
      },
      include: {
        user: true
      }
    });

    if (parseFloat(walletSender.balance.toString()) < amount) {
      throw new BadRequestException("Saldo insuficiente en la wallet del usuario origen");
    }

    let walletReceiver = await this.prisma.wallet.findFirst({
      where: {
        userId: userDestinationId,
        countryId: countryId,
      },
    });

    if (!walletReceiver) {
      // Si la wallet no existe, la creamos y la asignamos a la variable walletReceiver
      walletReceiver = await this.prisma.wallet.create({
        data: {
          userId: userDestinationId,
          countryId: countryId,
          balance: amount, // El saldo inicial es el monto de la transacción
          type: 'RECARGA',
        },
      });
    } else {
      // Si la wallet ya existe, simplemente incrementamos su saldo
      walletReceiver = await this.prisma.wallet.update({
        where: {
          id: walletReceiver.id,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
    }

    // se resta el saldo al usuario origen
    await this.prisma.wallet.update({
      where: {
        id: walletSenderId,
      },
      data: {
        balance: {
          decrement: amount,
        }
      }
    })

    //se suma al destino el saldo
    await this.prisma.walletTransactions.create({
      data: {
        amount: amount,
        amount_new: walletReceiver.balance, // El nuevo saldo ya está actualizado
        amount_old: parseFloat(walletReceiver.balance.toString()) - parseFloat(amount.toString()), // El saldo anterior
        wallet: {
          connect: {
            id: walletReceiver.id, // Conectar a la wallet del destinatario
          },
        },
        description: `Recepción por PanetPay del usuario @${userOrigin.user}`,
        type: 'DEPOSITO',
      },
    })

    // se resta al origen el saldo
    await this.prisma.walletTransactions.create({
      data: {
        amount: amount,
        amount_new: parseFloat(walletSender.balance.toString()) - parseFloat(amount.toString()),
        amount_old: walletSender.balance,
        wallet: {
          connect: {
            id: walletSenderId,
          },
        },
        description: "Envío a PanetPay del usuario @" + userOrigin.user,
        type: "RETIRO"
      },
    });

    const transaction = await this.prisma.transactionsPanetPay.create({
      data: {
        userOriginId: userOriginId,
        userDestinationId: userDestinationId,
        senderId: senderId,
        walletSenderId: walletSenderId,
        walletReceiverId: walletReceiver.id,
        amount: amount,
        countryId: countryId,
        currency: currency,
      }
    })

    return {data: transaction, message: "Transacción creada correctamente"};

  }

  async findAll(query) {
    const transactions = await this.prisma.transactionsPanetPay.findMany({
      where: {
        OR: [
          { userOriginId: query.senderId },
          { userDestinationId: query.senderId },
        ],
      },
      include: {
        userOrigin: {
          select: { publicId: true, name: true, user: true },
        },
        userDestination: {
          select: { publicId: true, name: true, user: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = transactions.map((transaction) => {
      const isSent = transaction.userOriginId === query.senderId;

      return {
        id: transaction.id,
        publicId: transaction.publicId,
        amount: transaction.amount,
        currency: transaction.currency,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        type: isSent ? 'sent' : 'received',
        counterparty: isSent ? transaction.userDestination : transaction.userOrigin,
      };
    });

    return {
      data,
      message: 'Transacciones obtenidas correctamente',
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} transactionsPanetPay`;
  }

  update(id: number, updateTransactionsPanetPayDto: UpdateTransactionsPanetPayDto) {
    return `This action updates a #${id} transactionsPanetPay`;
  }

  remove(id: number) {
    return `This action removes a #${id} transactionsPanetPay`;
  }

  async obtenerUsuarioWallets(query: any) {
    const { value } = query;
    if (!value)
      throw new BadRequestException(
        "Debe enviar un valor (correo o teléfono) para buscar el usuario"
      );

    const usuario = await this.prisma.user.findFirst({
      where: {
        OR: [
          { user: value },
          { phone: value }
        ]
      },
      include: {
        wallets: {
          where: {
            type: 'RECARGA'
          },
          include: {
            country: true
          }
        }
      }
    });

    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return usuario;
  }
}
