import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import * as bcrypt from "bcryptjs"
import axios from 'axios';

@Injectable()
export class UserService {

  constructor(private prisma: PrismaService) { }

  async create(createUserDto) {
    // Limpiar y formatear los campos
    createUserDto.user = createUserDto.user.trim().toUpperCase();
    createUserDto.phone = createUserDto.phone.trim();

    // Validar si el usuario o el teléfono ya existen
    const validate = await this.prisma.user.findFirst({
      where: {
        OR: [
          { user: createUserDto.user },
          { phone: createUserDto.phone },
        ],
      },
    });

    if (validate) {
      console.log(validate)
      throw new BadRequestException("El nombre de usuario o el número de teléfono ya existen");
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Crear el usuario en la base de datos
    const data = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        user: createUserDto.user,
        phone: createUserDto.phone,
        profitPercent: createUserDto.profitPercent,
        password: hashedPassword,
      },
    });

    return { data, message: "Usuario creado con éxito" };
  }

  async findAll(clients = false) {
    let whereCondition = {};

    if (clients) {
      whereCondition = {
        roles: {
          none: {},
        },
      };
    }

    const data = await this.prisma.user.findMany({
      where: whereCondition,
      include: { roles: true },
    });

    return { data, message: 'Usuarios obtenidos con éxito' };
  }

  async getUsersByRoles(rolesString) {
    const roles = rolesString.split(',');

    const data = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: roles
              }
            }
          }
        }
      },
      include: {
        wallets: true,
        clientes: true,
        referrals: true,
        referrer: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    return { data, message: 'Usuarios Con roles admin obtenmidos' }
  }

  async findOne(id) {
    const data = await this.prisma.user.findUnique({
      where: { id },
      include: {
        Recharge: {
          include: { wallet: true }
        },
        Transaction: {
          include: { wallet: true }
        },
        wallets: true,
        referrals: true
      }
    });

    // Contar recargas por estado
    const recargasPorEstado = {
      CREADA: data.Recharge.filter(recharge => recharge.status === 'CREADA').length,
      CANCELADA: data.Recharge.filter(recharge => recharge.status === 'CANCELADA').length,
      COMPLETADA: data.Recharge.filter(recharge => recharge.status === 'COMPLETADA').length
    };

    // Contar transacciones por estado
    const transaccionesPorEstado = {
      CREADA: data.Transaction.filter(transaction => transaction.status === 'CREADA').length,
      ANULADA: data.Transaction.filter(transaction => transaction.status === 'ANULADA').length,
      COMPLETADA: data.Transaction.filter(transaction => transaction.status === 'COMPLETADA').length
    };

    return {
      data,
      recargasPorEstado,
      transaccionesPorEstado,
      message: 'Cliente obtenido con éxito'
    };
  }

  async update(id, updateUserDto) {
    const data = await this.prisma.user.update({ where: { id }, data: updateUserDto })

    return { data, message: 'Usuario Actualizado con exito' }
  }

  async updatePassword(user: any, password: any) {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(password)
    const validate = await this.prisma.user.findFirst({ where: { user } })
    console.log(validate)
    if (!validate) throw new BadRequestException('Usuario no encontrado')

    const data = await this.prisma.user.update({ where: { user }, data: { password: hashedPassword } })

    const message = `
        Hola 👋, soy PanaMoney, tu asistente de PANET.
        Te traigo un mensaje importante:
        Tu contraseña ha sido restablecida exitosamente.
        Si no has realizado esta acción, por favor, comunícate con nosotros lo antes posible.
        ¡Gracias por confiar en nosotros!
    `;
    const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${validate.phone}&message=${encodeURIComponent(message)}`;

    await axios.get(whatsappUrl);

    return { data, message: 'Contraseña actualizada con exito' }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
