import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import * as bcrypt from "bcryptjs"
import axios from 'axios';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserService {

  constructor(private prisma: PrismaService) { }

  async create(createUserDto) {
    const validate = await this.prisma.user.findFirst({
      where: {
        OR: [
          { user: createUserDto.user },
          { phone: createUserDto.phone }, 
        ],
      },
    });
    
    if (validate) {
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

    const message = `*Departamento de TI - PANET EIRL:*\n\nHola, ${createUserDto.name}, te informamos que tus accesos a nuestras apps han cambiado. Ahora son:\n\n*Usuario:* ${createUserDto.user}\n*Password:* ${createUserDto.password}\n\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

    const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${createUserDto.phone}&message=${encodeURIComponent(message)}`;

    try {
      await axios.get(whatsappUrl);
      console.log('Mensaje enviado con éxito a través de WhatsApp');
    } catch (error) {
      console.error('Error al enviar el mensaje por WhatsApp:', error.message);
    }

    return { data, message: "Usuario creado con éxito" };
  }


  async findAll() {
    const data = await this.prisma.user.findMany({ include: { roles: true } })

    return { data, message: 'Usuarios Obtenidos con exito' }
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

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(id, updateUserDto) {
    const data = await this.prisma.user.update({ where: { id }, data: updateUserDto })

    return { data, message: 'Usuario Actualizado con exito' }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
