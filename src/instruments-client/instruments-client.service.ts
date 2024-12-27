import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateInstrumentsClientDto } from "./dto/create-instruments-client.dto";
import { UpdateInstrumentsClientDto } from "./dto/update-instruments-client.dto";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class InstrumentsClientService {
  constructor(private prisma: PrismaService) { }

  async create(createInstrumentsClientDto: CreateInstrumentsClientDto) {
    // Validación inicial
    if (!createInstrumentsClientDto) {
      throw new BadRequestException('No se proporcionaron datos para crear el instrumento');
    }
    try {
      // Validar que countryId exista ya que es requerido
      if (!createInstrumentsClientDto.countryId) {
        throw new BadRequestException('El countryId es requerido');
      }

      const data = await this.prisma.instrumentsClient.create({
        data: {
          document: createInstrumentsClientDto.document ?? null,
          holder: createInstrumentsClientDto.holder,
          accountNumber: createInstrumentsClientDto.accountNumber,
          accountTypeId: createInstrumentsClientDto.accountTypeId ?? null,
          countryId: createInstrumentsClientDto.countryId,
          bankId: createInstrumentsClientDto.bankId ?? null,
          typeInstrument: createInstrumentsClientDto.typeInstrument,
          useInstruments: createInstrumentsClientDto.useInstruments ?? null,
          clientId: createInstrumentsClientDto.clientId ?? null,
          userId: createInstrumentsClientDto.userId ?? null,
        },
      });

      return {
        data,
        message: 'Instrumento Creado con éxito',
      };
    } catch (error) {
      console.error('Error al crear instrumento:', error);
      throw new BadRequestException(
        error.message || 'Error al crear el instrumento'
      );
    }
  }

  async findAll(
    clientId?: string,
    userId?: string,
    bankId?: string,
    countryId?: string,
    accountTypeId?: string,
    useInstruments?: string
  ) {
    const filters: any = {};

    if (clientId) filters.clientId = clientId;
    if (userId) filters.userId = userId;
    if (bankId) filters.bankId = bankId;
    if (countryId) filters.countryId = countryId;
    if (accountTypeId) filters.accountTypeId = accountTypeId;
    if (useInstruments) filters.useInstruments = useInstruments;

    const data = await this.prisma.instrumentsClient.findMany({
      where: filters,
      include: {
        bank: true,
        country: true,
        accountType: true
      }
    });

    return { data, message: 'Instrumentos encontrados con éxito' };
  }


  findOne(id: number) {
    return `This action returns a #${id} instrumentsClient`;
  }

  async update(id: string, updateInstrumentsClientDto: UpdateInstrumentsClientDto) {
    const data = await this.prisma.instrumentsClient.update({ where: { id }, data: updateInstrumentsClientDto })

    return { data, message: 'Instrumento Actualizado con exito' }
  }

  remove(id: number) {
    return `This action removes a #${id} instrumentsClient`;
  }
}
