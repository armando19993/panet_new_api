import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { PrismaService } from "src/prisma/prisma.servise";
import axios from "axios";
import { TelegramService } from "src/telegram/telegram.service";

@Injectable()
export class ClientService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async create(createClientDto: CreateClientDto) {
    const data = await this.prisma.client.create({ data: createClientDto });

    return { data, message: "Cliente creado con exito" };
  }

  async findAll(intemediarioId) {
    const whereCondition = intemediarioId ? { intermediaryId: intemediarioId } : {};
    
    const data = await this.prisma.client.findMany({
      where: whereCondition,
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
    return { data, message: "Clientes obtenidos con exito!" };
  }

  async findOne(document) {
    const data = await this.prisma.client.findFirst({
      where: {
        OR: [
          { id: document },
          { document: document.toString() }
        ]
      },
      include: {
        instruments: {
          include: {
            country: true,
            bank: true,
            accountType: true
          }
        },
        Transaction: true
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
