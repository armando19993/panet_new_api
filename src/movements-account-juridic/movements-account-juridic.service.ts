import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.servise';
import { CreateMovementsAccountJuridicDto } from './dto/create-movements-account-juridic.dto';
import { UpdateMovementsAccountJuridicDto } from './dto/update-movements-account-juridic.dto';

@Injectable()
export class MovementsAccountJuridicService {
  constructor(private prisma: PrismaService) {}

  async create(createMovementsAccountJuridicDto: CreateMovementsAccountJuridicDto) {
    // Get the last movement record to calculate the new amount_account
    const lastMovement = await this.prisma.movementsAccountJuridic.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const currentAmount = parseFloat(createMovementsAccountJuridicDto.amount);
    const previousAmountAccount = lastMovement ? parseFloat(lastMovement.amount_account.toString()) : 0;

    // Calculate new amount_account based on movement type
    const newAmountAccount = createMovementsAccountJuridicDto.type === 'INGRESO'
      ? previousAmountAccount + currentAmount
      : previousAmountAccount - currentAmount;

    const data = {
      amount: currentAmount,
      amount_account: newAmountAccount,
      type: createMovementsAccountJuridicDto.type,
      description: createMovementsAccountJuridicDto.description,
      ...(createMovementsAccountJuridicDto.date && {
        date: new Date(createMovementsAccountJuridicDto.date)
      })
    };

    return this.prisma.movementsAccountJuridic.create({ data });
  }

  async findAll(query?: {
    startDate?: string;
    endDate?: string;
    specificDate?: string;
    type?: 'INGRESO' | 'EGRESO';
  }) {
    const filters: any = {};

    if (query?.specificDate) {
      const specificDate = new Date(query.specificDate);
      const startOfDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate());
      const endOfDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate() + 1);
      filters.date = {
        gte: startOfDay,
        lt: endOfDay
      };
    } else {
      if (query?.startDate) {
        filters.date = { gte: new Date(query.startDate) };
      }
      if (query?.endDate) {
        filters.date = { ...filters.date, lte: new Date(query.endDate) };
      }
    }

    if (query?.type) {
      filters.type = query.type;
    }

    return this.prisma.movementsAccountJuridic.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.movementsAccountJuridic.findUnique({
      where: { id }
    });
  }

  async update(id: string, updateMovementsAccountJuridicDto: UpdateMovementsAccountJuridicDto) {
    const data: any = {};

    if (updateMovementsAccountJuridicDto.amount !== undefined) {
      data.amount = parseFloat(updateMovementsAccountJuridicDto.amount);
    }
    if (updateMovementsAccountJuridicDto.amount_account !== undefined) {
      data.amount_account = parseFloat(updateMovementsAccountJuridicDto.amount_account);
    }
    if (updateMovementsAccountJuridicDto.type !== undefined) {
      data.type = updateMovementsAccountJuridicDto.type;
    }
    if (updateMovementsAccountJuridicDto.description !== undefined) {
      data.description = updateMovementsAccountJuridicDto.description;
    }
    if (updateMovementsAccountJuridicDto.date !== undefined) {
      data.date = new Date(updateMovementsAccountJuridicDto.date);
    }

    return this.prisma.movementsAccountJuridic.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    return this.prisma.movementsAccountJuridic.delete({
      where: { id }
    });
  }
}
