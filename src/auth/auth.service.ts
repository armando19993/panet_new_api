import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "src/prisma/prisma.servise";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

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

    const isPasswordValid = await bcrypt.compare(password, val.password);
    if (!isPasswordValid)
      throw new BadRequestException("Contraseña incorrecta");

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
