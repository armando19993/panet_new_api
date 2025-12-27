import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.servise';
import { TelegramService } from 'src/telegram/telegram.service';
import { CreateMovementsAccountJuridicDto } from './dto/create-movements-account-juridic.dto';
import { UpdateMovementsAccountJuridicDto } from './dto/update-movements-account-juridic.dto';
import axios from 'axios';

@Injectable()
export class MovementsAccountJuridicService {
  constructor(
    private prisma: PrismaService,
    private readonly telegramService: TelegramService
  ) { }

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
  }, user?: any) {
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

      
      else {
        const today = new Date();
        fechaIni = fmt(today);
        fechaFin = fmt(today);
      }

      const requestPayload = {
        cuenta: '01020645640000997168',
        fechaIni,
        fechaFin,
        tipoMoneda: 'VES',
        nroMovimiento: ''
      };

      console.log('🔍 [MovementsAccountJuridic] Consultando API Banvenez:', {
        fechaIni,
        fechaFin,
        payload: requestPayload
      });

      const response = await axios.post(
        'https://bdvconciliacion.banvenez.com:443/apis/bdv/consulta/movimientos',
        requestPayload,
        {
          headers: {
            'x-api-key': process.env.BANVENEZ_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📥 [MovementsAccountJuridic] Respuesta de API:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        hasMovimientos: !!response.data?.movimientos,
        hasData: !!response.data?.data,
        rawDataPreview: JSON.stringify(response.data).substring(0, 500)
      });

      // Intentar extraer los movimientos de diferentes estructuras posibles
      let movements = [];

      // La estructura de la API Banvenez es: { code, message, data: { totalOfMovements, movs: [...] } }
      if (response.data?.data?.movs && Array.isArray(response.data.data.movs)) {
        movements = response.data.data.movs;
      } else if (Array.isArray(response.data)) {
        movements = response.data;
      } else if (response.data?.movimientos && Array.isArray(response.data.movimientos)) {
        movements = response.data.movimientos;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        movements = response.data.data;
      } else if (response.data?.resultado && Array.isArray(response.data.resultado)) {
        movements = response.data.resultado;
      } else if (response.data && typeof response.data === 'object') {
        // Si la respuesta es un objeto, intentar buscar arrays dentro recursivamente
        const findArrayInObject = (obj: any): any[] | null => {
          if (Array.isArray(obj)) {
            return obj;
          }
          if (obj && typeof obj === 'object') {
            for (const key in obj) {
              if (Array.isArray(obj[key])) {
                return obj[key];
              }
              const found = findArrayInObject(obj[key]);
              if (found) {
                return found;
              }
            }
          }
          return null;
        };
        const found = findArrayInObject(response.data);
        if (found) {
          movements = found;
        }
      }

      console.log('✅ [MovementsAccountJuridic] Movimientos extraídos:', {
        count: movements.length,
        firstItem: movements[0] || null
      });

      // Enviar notificación a Telegram
      const searchType = fechaIni === fechaFin ? 'Fecha específica' : 'Rango de fechas';
      const message = `
<b>🔔 Consulta de Movimientos Jurídicos</b>
<b>Usuario:</b> ${user.name} (${user.user})
<b>Total extraídos:</b> ${movements.length}
<b>Tipo de búsqueda:</b> ${searchType}
<b>Fecha inicio:</b> ${fechaIni}
<b>Fecha fin:</b> ${fechaFin}
<b>Fecha consulta:</b> ${new Date().toLocaleString()}
      `;
      await this.telegramService.sendMessage(5720214404, message);

      return {
        data: movements,
        total: movements.length,
        fechaIni,
        fechaFin,
        type: query?.type || null,
        debug: {
          responseStructure: Object.keys(response.data || {}),
          extractedCount: movements.length
        }
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
