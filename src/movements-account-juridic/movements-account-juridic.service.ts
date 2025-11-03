import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.servise';
import { CreateMovementsAccountJuridicDto } from './dto/create-movements-account-juridic.dto';
import { UpdateMovementsAccountJuridicDto } from './dto/update-movements-account-juridic.dto';
import axios from 'axios';

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
    try {
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      let fechaIni: string;
      let fechaFin: string;

      if (query?.specificDate) {
        const d = new Date(query.specificDate);
        fechaIni = fmt(d);
        fechaFin = fmt(d);
      } else if (query?.startDate || query?.endDate) {
        if (query.startDate && query.endDate) {
          fechaIni = fmt(new Date(query.startDate));
          fechaFin = fmt(new Date(query.endDate));
        } else if (query.startDate) {
          const d = new Date(query.startDate);
          fechaIni = fmt(d);
          fechaFin = fmt(d);
        } else if (query.endDate) {
          const d = new Date(query.endDate);
          fechaIni = fmt(d);
          fechaFin = fmt(d);
        }
      } else {
        const today = new Date();
        fechaIni = fmt(today);
        fechaFin = fmt(today);
      }

      const response = await axios.post(
        'https://bdvconciliacion.banvenez.com:443/apis/bdv/consulta/movimientos',
        {
          cuenta: '01020645640000997168',
          fechaIni,
          fechaFin,
          tipoMoneda: 'VES',
          nroMovimiento: ''
        },
        {
          headers: {
            'x-api-key': process.env.BANVENEZ_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
      
    } catch (error) {
      throw new HttpException(
        'Error al consultar los movimientos bancarios',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

  async getAccountBalance() {
    try {
      const response = await axios.post(
        'https://bdvconciliacion.banvenez.com/account/balance',
        {
          account: '01020645640000997168',
          currency: 'VES'
        },
        {
          headers: {
            'x-api-key': process.env.BANVENEZ_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        code: response.data.code,
        message: response.data.message,
        accountNumber: response.data.cuentaPrincipal,
        blockedBalance: response.data.ppalSdoRetTot,
        availableBalance: response.data.ppalSdoFinal
      };
    } catch (error) {
      throw new HttpException(
        'Error al consultar el saldo de la cuenta bancaria',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
