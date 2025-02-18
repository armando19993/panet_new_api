import { Injectable } from '@nestjs/common';
import { CreateColaEsperaDto } from './dto/create-cola-espera.dto';
import { UpdateColaEsperaDto } from './dto/update-cola-espera.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class ColaEsperaService {
  constructor(private prisma: PrismaService) { }

  async create(createColaEsperaDto: CreateColaEsperaDto) {
    if (createColaEsperaDto.type === 'transaction') {
      console.log(createColaEsperaDto.transactionId)
      let validate = await this.prisma.colaEspera.findFirst({
        where: {
          AND: [
            { type: 'TRANSACCION' },
            { transactionId: createColaEsperaDto.transactionId }
          ]
        }
      })
      console.log
      if (validate) {
        console.log("se actualizo")
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

  remove(id: number) {
    return `This action removes a #${id} colaEspera`;
  }
}
