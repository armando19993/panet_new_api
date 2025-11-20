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
      let startDate: Date;
      let endDate: Date;

      if (query?.specificDate) {
        startDate = parseDate(query.specificDate);
        endDate = parseDate(query.specificDate);
        fechaIni = fmt(startDate);
        fechaFin = fmt(endDate);
      } else if (query?.startDate || query?.endDate) {
        if (query.startDate && query.endDate) {
          startDate = parseDate(query.startDate);
          endDate = parseDate(query.endDate);
          fechaIni = fmt(startDate);
          fechaFin = fmt(endDate);
        } else if (query.startDate) {
          startDate = parseDate(query.startDate);
          endDate = startDate;
          fechaIni = fmt(startDate);
          fechaFin = fmt(endDate);
        } else if (query.endDate) {
          endDate = parseDate(query.endDate);
          startDate = endDate;
          fechaIni = fmt(startDate);
          fechaFin = fmt(endDate);
        }
      } else {
        const today = new Date();
        startDate = today;
        endDate = today;
        fechaIni = fmt(today);
        fechaFin = fmt(today);
      }

      // Obtener todos los movimientos haciendo paginación automática
      const allMovements = await this.fetchAllMovementsWithPagination(fechaIni, fechaFin);

      // Filtrar por tipo si se especifica
      let filteredMovements = allMovements;
      if (query?.type) {
        filteredMovements = allMovements.filter((mov: any) => {
          const tipo = mov.tipo?.toUpperCase() || mov.tipoMovimiento?.toUpperCase();
          return tipo === query.type?.toUpperCase();
        });
      }

      return {
        data: filteredMovements,
        total: filteredMovements.length,
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

  private async fetchAllMovementsWithPagination(fechaIni: string, fechaFin: string): Promise<any[]> {
    // Si las fechas son iguales o el rango es pequeño, intentar paginación directa
    if (fechaIni === fechaFin) {
      return await this.fetchMovementsForDate(fechaIni);
    }

    // Para rangos grandes, dividir por días individuales para asegurar obtener todos los registros
    const allMovements: any[] = [];
    const dateRange = this.getDateRangeFromStrings(fechaIni, fechaFin);

    for (const date of dateRange) {
      const movements = await this.fetchMovementsForDate(date);
      allMovements.push(...movements);
      // Pequeña pausa entre días para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return this.removeDuplicateMovements(allMovements);
  }

  private async fetchMovementsForDate(fecha: string): Promise<any[]> {
    const allMovements: any[] = [];
    const maxAttempts = 10; // Límite razonable de intentos por día
    let attempt = 0;
    let lastNroMovimiento = '';
    const seenIds = new Set<string>();

    while (attempt < maxAttempts) {
      try {
        const response = await axios.post(
          'https://bdvconciliacion.banvenez.com:443/apis/bdv/consulta/movimientos',
          {
            cuenta: '01020645640000997168',
            fechaIni: fecha,
            fechaFin: fecha,
            tipoMoneda: 'VES',
            nroMovimiento: lastNroMovimiento
          },
          {
            headers: {
              'x-api-key': process.env.BANVENEZ_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

        const movements = response.data?.movimientos || response.data?.data || response.data || [];
        
        if (!Array.isArray(movements) || movements.length === 0) {
          break;
        }

        // Filtrar duplicados en esta página
        const newMovements = movements.filter((mov: any) => {
          const identifier = mov.nroMovimiento || mov.numeroMovimiento || mov.id || JSON.stringify(mov);
          if (seenIds.has(identifier)) {
            return false;
          }
          seenIds.add(identifier);
          return true;
        });

        if (newMovements.length === 0) {
          // No hay movimientos nuevos, probablemente ya obtuvimos todos
          break;
        }

        allMovements.push(...newMovements);

        // Si obtuvimos menos de 100 registros, probablemente ya obtuvimos todos
        if (movements.length < 100) {
          break;
        }

        // Intentar usar el último nroMovimiento como offset para la siguiente página
        const lastMovement = movements[movements.length - 1];
        const nextNroMovimiento = lastMovement?.nroMovimiento || lastMovement?.numeroMovimiento || lastMovement?.id;

        // Si no hay nroMovimiento diferente o es el mismo que el anterior, salir
        if (!nextNroMovimiento || nextNroMovimiento === lastNroMovimiento) {
          break;
        }

        lastNroMovimiento = nextNroMovimiento;
        attempt++;

        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        // Si es el primer intento y falla, lanzar el error
        if (attempt === 0) {
          throw error;
        }
        // Si falla en intentos posteriores, asumimos que ya obtuvimos todo lo posible
        break;
      }
    }

    return allMovements;
  }

  private getDateRangeFromStrings(fechaIni: string, fechaFin: string): string[] {
    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    // Parsear fechas desde formato DD/MM/YYYY
    const parseDate = (dateStr: string): Date => {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseDate(fechaIni);
    const end = parseDate(fechaFin);
    const dates: string[] = [];

    const current = new Date(start);
    while (current <= end) {
      dates.push(fmt(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private removeDuplicateMovements(movements: any[]): any[] {
    const seen = new Set<string>();
    return movements.filter((mov) => {
      const identifier = mov.nroMovimiento || mov.numeroMovimiento || mov.id || JSON.stringify(mov);
      if (seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
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
