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

  async findAll() {
    return `This action returns all userRole`;
  }

  async findOne(id: number) {
    return `This action returns a #${id} userRole`;
  }

  async update(id: number, updateUserRoleDto: UpdateUserRoleDto) {
    return `This action updates a #${id} userRole`;
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
