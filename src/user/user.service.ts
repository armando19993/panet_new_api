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
    // Verificar si el usuario ya existe
    const validate = await this.prisma.user.findFirst({
      where: { user: createUserDto.user },
    });
    if (validate) {
      throw new BadRequestException("Este Nombre de usuario ya existe");
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

    // Construir el mensaje personalizado
    const message = `*Departamento de TI - PANET EIRL:*\n\nHola, ${createUserDto.name}, te informamos que tus accesos a nuestras apps han cambiado. Ahora son:\n\n*Usuario:* ${createUserDto.user}\n*Password:* ${createUserDto.password}\n\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

    // URL para enviar el mensaje
    const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${createUserDto.phone}&message=${encodeURIComponent(message)}`;

    // Intentar enviar el mensaje por WhatsApp
    try {
      await axios.get(whatsappUrl);
      console.log('Mensaje enviado con éxito a través de WhatsApp');
    } catch (error) {
      console.error('Error al enviar el mensaje por WhatsApp:', error.message);
      // Aquí puedes decidir si ignorar el error o lanzar una excepción
    }

    return { data, message: "Usuario creado con éxito" };
  }


  async findAll() {
    const data = await this.prisma.user.findMany({ include: { roles: true } })

    return { data, message: 'Usuarios Obtenidos con exito' }
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}