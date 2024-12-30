import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PrismaService } from "src/prisma/prisma.servise";
import axios from "axios";

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    const data = await this.prisma.client.create({ data: createClientDto });

    return { data, message: "Cliente creado con exito" };
  }

  async findAll(intemediarioId) {
    try {
      const response = await axios.get('https://desarrollo.paneteirl.store/api/v1/clients');

      const clients = response.data.data;

      clients.forEach(async (client) => {
        await this.prisma.client.upsert({
          where: {
            document: client.document
          },
          update: {
            phone: client.phone,
            email: client.phone,
            name: client.full_name
          },
          create: {
            document: client.document,
            phone: client.phone,
            email: client.phone,
            name: client.full_name
          }
        })
      });

      console.log('Procesamiento completado.');
    } catch (error) {
      console.error('Error al obtener o procesar los datos:', error.message);
      throw new Error('Error al obtener los datos desde la API externa');
    }
  }

  async findOne(document) {
    const data = await this.prisma.client.findFirst({
      where: {
        document: document.toString(),
      },
      include: {
        instruments: {
          include: {
            country: true,
            bank: true,
            accountType: true
          }
        }
      },
    });
    if (!data) {
      throw new BadRequestException("Cliente no existe");
    }

    return { data, message: "Cliente obtenido con exito!" };
  }

  update(id: number, updateClientDto: UpdateClientDto) {
    return `This action updates a #${id} client`;
  }

  remove(id: number) {
    return `This action removes a #${id} client`;
  }
}
