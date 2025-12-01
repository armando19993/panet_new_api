import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) { }

  async create(createModuleDto: CreateModuleDto) {
    const data = await this.prisma.module.create({
      data: createModuleDto,
    });
    return { data, message: 'Módulo creado con éxito' };
  }

  async findAll() {
    const data = await this.prisma.module.findMany({
      include: { Permissions: true },
    });
    return { data, message: 'Módulos obtenidos con éxito' };
  }

  async findOne(id: number) {
    const data = await this.prisma.module.findUnique({
      where: { publicId: id },
      include: { Permissions: true },
    });
    if (!data) throw new NotFoundException('Módulo no encontrado');
    return { data, message: 'Módulo obtenido con éxito' };
  }

  async update(id: number, updateModuleDto: UpdateModuleDto) {
    const data = await this.prisma.module.update({
      where: { publicId: id },
      data: updateModuleDto,
    });
    return { data, message: 'Módulo actualizado con éxito' };
  }

  async remove(id: number) {
    const data = await this.prisma.module.delete({
      where: { publicId: id },
    });
    return { data, message: 'Módulo eliminado con éxito' };
  }
}
