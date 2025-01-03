import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { NotificationService } from "src/notification/notification.service";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private notificationService: NotificationService
  ) { }

  async login(data) {
    let { user, password } = data;
    const val = await this.prisma.user.findUnique({
      where: { user },
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
      await this.prisma.user.update({ where: { id: val.id }, data: { expoPushToken: data.pushToken } })
    }

    const isPasswordValid = await bcrypt.compare(password, val.password);
    if (!isPasswordValid)
      throw new BadRequestException("Contraseña incorrecta");

    this.notificationService.sendPushNotification(data.pushToken, 'Has Iniciado Sesion', 'Has iniciado sesion en un nuevo dispositivo, hemos actualizado tu codigo de notificacion')

    const token = await this.jwtService.signAsync(val);
    const roles = val.roles.map((userRole) => userRole.role.name);
    return {
      data: val,
      roles,
      token,
      message: "Usuario a iniciado sesion correctamente!",
    };
  }
}
