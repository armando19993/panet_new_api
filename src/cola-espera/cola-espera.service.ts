import { Injectable } from '@nestjs/common';
import { CreateColaEsperaDto } from './dto/create-cola-espera.dto';
import { UpdateColaEsperaDto } from './dto/update-cola-espera.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class ColaEsperaService {
  constructor(private prisma: PrismaService) { }

  create(createColaEsperaDto: CreateColaEsperaDto) {
    return 'This action adds a new colaEspera';
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

    const data = await this.prisma.colaEspera.findMany({ where: filter, include: { recharge: { include: { wallet: { include: { country: true } } } }, user: true, transaction: { include: { origen: true, destino: true } } }, orderBy: { publicId: 'desc' } })

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
