import { Injectable } from '@nestjs/common';
import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { UpdateWalletRequestDto } from './dto/update-wallet-request.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import { WalletState, WalletStatus } from '@prisma/client';

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

    if (startDate) {
      const start = new Date(startDate);
      let end;

      if (endDate) {
        // Si se proporciona endDate, incluir todo el día hasta las 23:59:59
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        // Si solo se proporciona startDate, incluir todo ese día hasta las 23:59:59
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      }

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    const data = await this.prisma.walletRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        country: true
      }
    });

    return { data, message: 'Listado de solicitudes obtenidas con éxito!' };
  }

  async findOne(id) {
    const data = await this.prisma.walletRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            Recharge: true,
            Transaction: true,
            WalletRequest: true,
          }
        },
        country: true
      }
    });

    if (!data) {
      throw new Error('No se encontró la solicitud');
    }

    return { data, message: 'Solicitud obtenida con éxito!' }
  }

  async update(id, updateWalletRequestDto: UpdateWalletRequestDto) {
    let data = null
    if (updateWalletRequestDto.status === 'APROBADO') {
      data = await this.prisma.walletRequest.update({
        where: { id },
        data: {
          wallet_state: WalletState.APROBADO,
        },
        include: {
          country: true,
          user: true
        }
      })

      await this.prisma.wallet.create({
        data: {
          consumer_id_type: data.consumer_id_type,
          consumer_id: data.consumer_id,
          type: 'RECARGA',
          balance: 0,
          userId: data.userId,
          countryId: data.countryId,
          status: WalletStatus.ACTIVO,
          walletRequestId: data.id
        }
      })
    }
    if (updateWalletRequestDto.status === 'RECHAZADO') {
      data = await this.prisma.walletRequest.update({
        where: { id },
        data: {
          wallet_state: WalletState.RECHAZADO,
        }
      })
    }

    return { data, message: `Wallet ${updateWalletRequestDto.status} con exito!` }
  }

  remove(id: number) {
    return `This action removes a #${id} walletRequest`;
  }
}
