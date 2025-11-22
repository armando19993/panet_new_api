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
    date?: string;
    type?: 'INGRESO' | 'EGRESO';
  }) {
    try {
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      // Parsear fechas correctamente como fechas locales
      const parseDate = (value: string): Date => {
        if (!value) {
          throw new HttpException('Fecha inválida', HttpStatus.BAD_REQUEST);
        }
        
        const parts = value.split('-');
        if (parts.length !== 3) {
          throw new HttpException(`Formato de fecha inválido: ${value}. Use YYYY-MM-DD`, HttpStatus.BAD_REQUEST);
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          throw new HttpException(`Fecha inválida: ${value}`, HttpStatus.BAD_REQUEST);
        }
        
        return new Date(year, month, day);
      };

      let fechaIni: string;
      let fechaFin: string;

      // Si se envía solo una fecha, usar la misma para inicio y fin
      if (query?.date) {
        const date = parseDate(query.date);
        fechaIni = fmt(date);
        fechaFin = fmt(date);
      }
      // Si se envían startDate y endDate, usar el rango
      else if (query?.startDate && query?.endDate) {
        const startDate = parseDate(query.startDate);
        const endDate = parseDate(query.endDate);
        fechaIni = fmt(startDate);
        fechaFin = fmt(endDate);
      }
      // Si solo se envía startDate, usar la misma fecha para inicio y fin
      else if (query?.startDate) {
        const date = parseDate(query.startDate);
        fechaIni = fmt(date);
        fechaFin = fmt(date);
      }
      // Si solo se envía endDate, usar la misma fecha para inicio y fin
      else if (query?.endDate) {
        const date = parseDate(query.endDate);
        fechaIni = fmt(date);
        fechaFin = fmt(date);
      }
      // Si no se envía ninguna fecha, usar la fecha de hoy
      else {
        const today = new Date();
        fechaIni = fmt(today);
        fechaFin = fmt(today);
      }

      // Consulta principal a la API de Banvenez
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

      const movements = response.data?.movimientos || response.data?.data || response.data || [];
      const movementsArray = Array.isArray(movements) ? movements : [];

      return {
        data: movementsArray,
        total: movementsArray.length,
        fechaIni,
        fechaFin,
        type: query?.type || null
      };
      
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al consultar los movimientos bancarios: ${error instanceof Error ? error.message : 'Error desconocido'}`,
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
