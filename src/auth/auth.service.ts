import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";
import * as bcrypt from "bcryptjs";
import { NotificationService } from "src/notification/notification.service";
import { PrismaService } from "src/prisma/prisma.servise";
import { WhatsappService } from "src/whatsapp/whatsapp.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private notificationService: NotificationService,
    private whatsappService: WhatsappService
  ) { }

  async login(data: LoginDto) {
    let { user, password } = data;

    const val = await this.prisma.user.findUnique({
      where: { user: user.trim() },
      include: {
        roles: {
          include: {
            role: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!val)
      throw new BadRequestException(
        "Usuario no existe en nuestra base de datos"
      );

    if (data.pushToken) {
      await this.prisma.user.update({ where: { id: val.id }, data: { expoPushToken: data.pushToken.data } })
    }

    const isPasswordValid = await bcrypt.compare(password, val.password);
    if (!isPasswordValid)
      throw new BadRequestException("Contraseña incorrecta");

    this.notificationService.sendPushNotification(data.pushToken ? data.pushToken.data : val.expoPushToken, 'Has Iniciado Sesion', 'Has iniciado sesion en un nuevo dispositivo, hemos actualizado tu codigo de notificacion')

    const token = await this.jwtService.signAsync(val);
    const roles = val.roles.map((userRole) => userRole.role.name);
    return {
      data: val,
      roles,
      token,
      message: "Usuario a iniciado sesion correctamente!",
    };
  }

  async sendOtp(user, otp) {
    const getUser = await this.prisma.user.findFirst({ where: { user } })

    if (!getUser) {
      throw new BadRequestException('Usuario no encontrado')
    }

    const message = `
        Hola 👋, soy PanaMoney, tu asistente de PANET.
        Te traigo un mensaje importante:
        Aquí está tu código para restablecer tu contraseña:
        Código: *${otp}*
    `;

    try {
      await this.whatsappService.sendTextMessage(getUser.phone, message);
      return { data: getUser, message: 'Codigo enviado correctamente' }
    } catch (error) {
      console.error('Error al enviar mensaje de WhatsApp:', error);
      return { data: getUser, message: 'Código generado, pero hubo un problema al enviarlo por WhatsApp' }
    }
  }


  async responseUpdate() {
    const json = {
      status: 'Activado',
      message: 'Estimado usuario, por razones mayores nuestra app se encuentra presentando fallos tecnicos en este momento, para asegurar una buena experiencia nos encontramos haciendo las correcciones y mejoras correspondientes, mientras podras hacer tus operaciones a traves de nuestra web: https://clientes.paneteirl.com',
      url: 'https://clientes.paneteirl.com'
    }

    return json
  }


  async getProfile(id: string) {
    const usuario = await this.prisma.user.findUnique({
      where: {
        id: id
      },
      include: {
        wallets: {
          where: {
            type: 'RECARGA'
          },
          include: {
            country: true
          }
        }
      }
    });

    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return usuario;
  }

  async updatePinPanetPay(data: any) {
    const { id, pin } = data;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          pin_panet_pay: pin
        }
      })

      return { data: updatedUser, message: 'Pin actualizado correctamente' }
    } catch (error) {
      throw new BadRequestException(error.message)
    }

  }

  async updateStatusPanetPay(data: any) {
    const { id, status } = data;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          status_panet_pay: status,
          bloqueo_panet_pay: status
            ? null
            : new Date(new Date().getTime() + 48 * 60 * 60 * 1000),
        }
      })

      return { data: updatedUser, message: 'Status actualizado correctamente' }
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }
}
