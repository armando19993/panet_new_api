import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) { }

  async create(createPermissionDto: CreatePermissionDto) {
    const data = await this.prisma.permissions.create({
      data: createPermissionDto,
    });
    return { data, message: 'Permiso creado con éxito' };
  }

  async findAll() {
    const data = await this.prisma.permissions.findMany({
      include: { module: true },
    });
    return { data, message: 'Permisos obtenidos con éxito' };
  }

  async findOne(id: number) {
    const data = await this.prisma.permissions.findUnique({
      where: { publicId: id },
      include: { module: true },
    });
    if (!data) throw new NotFoundException('Permiso no encontrado');
    return { data, message: 'Permiso obtenido con éxito' };
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto) {
    const data = await this.prisma.permissions.update({
      where: { publicId: id },
      data: updatePermissionDto,
    });
    return { data, message: 'Permiso actualizado con éxito' };
  }

  async remove(id: number) {
    const data = await this.prisma.permissions.delete({
      where: { publicId: id },
    });
    return { data, message: 'Permiso eliminado con éxito' };
  }
}
