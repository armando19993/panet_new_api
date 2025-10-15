import { Injectable } from '@nestjs/common';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class UserRoleService {

  constructor(private prisma: PrismaService) { }

  async create(createUserRoleDto: CreateUserRoleDto) {
    const data = await this.prisma.userRole.create({
      data: createUserRoleDto
    })

    return { data, message: 'Rol Creado con exito' }
  }

  async findAll(userId?: string) {
    const where = userId ? { userId: userId } : {};
    
    const data = await this.prisma.userRole.findMany({
      where,
      include: {
        role: true,
        user: true
      }
    });

    return { data, message: 'Roles obtenidos con éxito' };
  }

  async findOne(id: number) {
    return `This action returns a #${id} userRole`;
  }

  async update(userId: string, updateUserRoleDto: UpdateUserRoleDto) {
    // Eliminar todos los roles existentes del usuario
    await this.prisma.userRole.deleteMany({
      where: {
        userId: userId
      }
    });

    // Crear los nuevos roles
    const userRoles = updateUserRoleDto.roles.map(roleId => ({
      userId: userId,
      roleId: roleId
    }));

    await this.prisma.userRole.createMany({
      data: userRoles
    });

    // Obtener los roles actualizados
    const data = await this.prisma.userRole.findMany({
      where: {
        userId: userId
      },
      include: {
        role: true
      }
    });

    return { data, message: 'Roles actualizados con éxito' };
  }

  async remove(userId, roleId) {
    const data = await this.prisma.userRole.delete({
      where:
      {
        userId_roleId: {
          userId: userId,
          roleId: roleId
        }
      }
    })

    return { data, message: 'Role Eliminado con exito' }
  }
}
