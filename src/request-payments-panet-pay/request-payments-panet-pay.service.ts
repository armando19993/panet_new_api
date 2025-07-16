import { Injectable } from '@nestjs/common';
import { CreateRequestPaymentsPanetPayDto } from './dto/create-request-payments-panet-pay.dto';
import { UpdateRequestPaymentsPanetPayDto } from './dto/update-request-payments-panet-pay.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import { TransactionsPanetPayService } from 'src/transactions-panet-pay/transactions-panet-pay.service';

@Injectable()
export class RequestPaymentsPanetPayService {

  constructor(
    private prisma: PrismaService,
    private transactionsPanetPayService: TransactionsPanetPayService,
  ) { }

  create(createRequestPaymentsPanetPayDto: CreateRequestPaymentsPanetPayDto) {
    const data = this.prisma.requestPaymentsPanetPay.create({
      data: {
        requesterId: createRequestPaymentsPanetPayDto.requesterId,
        requestedUserId: createRequestPaymentsPanetPayDto.requestedUserId,
        amount: createRequestPaymentsPanetPayDto.amount,
        countryId: createRequestPaymentsPanetPayDto.countryId,
        currency: createRequestPaymentsPanetPayDto.currency,
        description: createRequestPaymentsPanetPayDto.description,
        status: createRequestPaymentsPanetPayDto.status,
      },
      include: {
        requester: true,
        requestedUser: true,
      }
    });

    return data;
  }

  async findAll(userId: string) {
    const allRequests = await this.prisma.requestPaymentsPanetPay.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { requestedUserId: userId },
        ],
      },
      include: {
        requester: true,
        requestedUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return allRequests.map(request => ({
      ...request,
      type: request.requesterId === userId ? 'sent' : 'received',
    }));
  }

  findOne(id: string) {
    return this.prisma.requestPaymentsPanetPay.findUnique({
      where: { id },
      include: {
        requester: true,
        requestedUser: true,
      },
    });
  }

  async update(id: string, updateRequestPaymentsPanetPayDto: UpdateRequestPaymentsPanetPayDto) {
    const { status, ...dataToUpdate } = updateRequestPaymentsPanetPayDto;

    if (status !== 'PAID') {
      return this.prisma.requestPaymentsPanetPay.update({
        where: { id },
        data: { status, ...dataToUpdate },
      });
    }

    const requestPayment = await this.prisma.requestPaymentsPanetPay.findUnique({
      where: { id },
    });

    if (!requestPayment) {
      throw new Error('Solicitud de pago no encontrada');
    }

    // 1. Encontrar wallets
    const senderWallet = await this.prisma.wallet.findFirst({
      where: { userId: requestPayment.requestedUserId, countryId: requestPayment.countryId, type: 'RECARGA' },
    });

    const receiverWallet = await this.prisma.wallet.findFirst({
      where: { userId: requestPayment.requesterId, countryId: requestPayment.countryId, type: 'RECARGA' },
    });

    if (!senderWallet || !receiverWallet) {
      throw new Error('No se encontraron las billeteras para la transacción.');
    }

    console.log({
      userOriginId: requestPayment.requesterId,
      userDestinationId: requestPayment.requestedUserId,
      walletSenderId: senderWallet.id,
      walletReceiverId: receiverWallet.id,
      senderId: requestPayment.requesterId,
      amount: parseFloat(requestPayment.amount.toString()),
      countryId: requestPayment.countryId,
      currency: requestPayment.currency,
    })

    return this.prisma.$transaction(async (prisma) => {

      // 3. Crear registro en TransactionsPanetPay usando el servicio
      const newTransaction = await this.transactionsPanetPayService.create({
        userOriginId: requestPayment.requestedUserId,
        userDestinationId: requestPayment.requesterId,
        walletSenderId: senderWallet.id,
        walletReceiverId: receiverWallet.id,
        senderId: requestPayment.requestedUserId,
        amount: parseFloat(requestPayment.amount.toString()),
        countryId: requestPayment.countryId,
        currency: requestPayment.currency,
      });

      // 4. Actualizar la solicitud de pago
      return prisma.requestPaymentsPanetPay.update({
        where: { id },
        data: {
          status: 'PAID',
          transactionId: newTransaction.data.id,
        },
      });
    });
  }

  remove(id: string) {
    return this.prisma.requestPaymentsPanetPay.delete({
      where: { id },
    });
  }
}
