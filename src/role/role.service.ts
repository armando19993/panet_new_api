import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class RoleService {

  constructor(private prisma: PrismaService) { }

  async create(createRoleDto: CreateRoleDto) {
    const { permissions, ...roleData } = createRoleDto;
    const data = await this.prisma.role.create({
      data: {
        ...roleData,
        permissions: {
          connect: permissions?.map((id) => ({ id })) || [],
        },
      },
      include: { permissions: true },
    });
    return { data, message: 'Rol creado con exito' };
  }

  async findAll() {
    const data = await this.prisma.role.findMany({ include: { permissions: true } });

    return { data, message: 'Roles Obtenidos con exito' };
  }

  async findOne(id: string) {
    const data = await this.prisma.role.findUnique({
      where: { id: id },
      include: { permissions: true },
    });
    return { data, message: 'Rol obtenido con exito' };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const { permissions, ...roleData } = updateRoleDto;
    const data = await this.prisma.role.update({
      where: { publicId: id },
      data: {
        ...roleData,
        permissions: permissions
          ? {
            set: permissions.map((id) => ({ id })),
          }
          : undefined,
      },
      include: { permissions: true },
    });
    return { data, message: 'Rol actualizado con exito' };
  }

  async remove(id: number) {
    const data = await this.prisma.role.delete({
      where: { publicId: id },
    });
    return { data, message: 'Rol eliminado con exito' };
  }
}
