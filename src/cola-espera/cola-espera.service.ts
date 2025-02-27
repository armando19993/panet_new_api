import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateColaEsperaDto } from './dto/create-cola-espera.dto';
import { UpdateColaEsperaDto } from './dto/update-cola-espera.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class ColaEsperaService {
  constructor(private prisma: PrismaService) { }

  async create(createColaEsperaDto: CreateColaEsperaDto) {
    if (createColaEsperaDto.type === 'transaction') {
      const val = await this.prisma.transaction.findUnique({ where: { id: createColaEsperaDto.transactionId } })
      if (val.status === 'COMPLETADA') {
        throw new BadRequestException("Esta Transaccion se encuentra en estado completado, para poder colocarlo en cola, contacta con TI")
        return
      }
      let validate = await this.prisma.colaEspera.findFirst({
        where: {
          AND: [
            { type: 'TRANSACCION' },
            { transactionId: createColaEsperaDto.transactionId }
          ]
        }
      })

      if (validate) {
        await this.prisma.colaEspera.update({
          where: {
            id: validate.id
          },
          data: {
            status: 'INICIADA'
          }
        })
      }

      else {
        console.log("se creo")
        validate = await this.prisma.colaEspera.create({
          data: {
            status: 'INICIADA',
            transactionId: createColaEsperaDto.transactionId,
            userId: createColaEsperaDto.despachadorId,
            type: 'TRANSACCION'
          }
        })
      }

      return { validate, message: 'Has asignado correctamente la operacion a la cola!' }
    }
  }

  async transferMasive(data) {
    const { transactionsIds, despachadorId, type } = data

    transactionsIds.map(async (row) => {
      if (row !== 1) {
        await this.prisma.colaEspera.update({
          where: { id: row },
          data: { userId: despachadorId }
        })
      }
    })

    return { data, message: 'Transferencia Masiva echa con exito' }
  }

  async findAll(query: any) {
    const { type, userId, status } = query

    const filter: any = {}

    if (type) {
      filter.type = type
    }

    if (userId) {
      filter.userId = userId
    }

    if (status && status != 'ALL') {
      filter.status = status
    }

    const data = await this.prisma.colaEspera.findMany({ where: filter, include: { recharge: { include: { wallet: { include: { country: true } } } }, user: true, transaction: { include: { origen: true, destino: true, wallet: { include: { country: true } } } } }, orderBy: { publicId: 'desc' } })

    return { data, message: 'Transacciones Pendientes con exito' }
  }

  findOne(id: number) {
    return `This action returns a #${id} colaEspera`;
  }

  async update(id, updateColaEsperaDto) {
    const update = await this.prisma.colaEspera.update({
      where: {
        id
      },
      data: {
        status: updateColaEsperaDto.status
      }
    })

    return { update, message: 'Cola Actualizado con exito' }
  }

  async remove(id) {
    const data = await this.prisma.colaEspera.delete({ where: { id } })

    return { data, message: 'Cola eliminada con exito' }
  }
}
