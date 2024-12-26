import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.servise";
import axios from "axios";

@Injectable()
export class RechargeService {
  constructor(private prisma: PrismaService) { }

  async create(createRechargeDto, user, file) {
    let data = null;

    if (createRechargeDto.type === "AUTOMATIZADO") {
      const countryLowercase = createRechargeDto.country.toLowerCase();

      try {
        const payload: { amount: string; sandbox: boolean; currency?: string } =
        {
          amount: createRechargeDto.amount.toString(),
          sandbox: true,
        };

        // Agregar currency solo si el país es PE
        if (createRechargeDto.country === "PE") {
          payload.currency = "PEN";
        }

        const response = await axios.post(
          `https://api.floid.app/${countryLowercase}/payments/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer cc051fc11360e1e313ee4c99579648972ab3ca514b73d947cb13283caf81861d9c8eb1691e33e3c39ab881c180cef59391285ea5fcc4c77431b29d1d4f0b0aa1`,
              "Content-Type": "application/json",
              Cookie: "PHPSESSID=rjku07cupvna4bjuf5bigs4ntk",
            },
          }
        );

        const token = response.data.payment_token;

        try {
          data = await this.prisma.recharge.create({
            data: {
              userId: user.id,
              walletId: createRechargeDto.walletId,
              amount: createRechargeDto.amount,
              type: "AUTOMATIZADO",
              status: "CREADA",
              comprobante: createRechargeDto.comprobante || null,
              comentario: createRechargeDto.comentario || null,
              nro_referencia: token,
              fecha_comprobante: new Date(),
            },
          });

          return { data, message: "Recarga creada con exito!" };
        } catch (error) {
          console.error("Error al crear la recarga manual:", error.message);
          return {
            data: null,
            message: "Error al crear la recarga manual",
          };
        }
      } catch (error) {
        if (error.response) {
          console.error(
            "Error al crear el pago automatizado:",
            error.response.data
          );
          return {
            data: error.response.data,
            status: error.response.status,
            message: "Error al crear el pago automatizado",
          };
        } else {
          console.error("Error sin respuesta del servidor:", error.message);
          return {
            data: null,
            message: "Error de conexión o de red",
          };
        }
      }
    } else {
      const fileUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${file.filename}`;
      try {
        data = await this.prisma.recharge.create({
          data: {
            userId: user.id,
            walletId: createRechargeDto.walletId,
            amount: createRechargeDto.amount,
            type: "MANUAL",
            status: "CREADA",
            comprobante: fileUrl || null,
            comentario: createRechargeDto.comentario || null,
            nro_referencia: createRechargeDto.nro_referencia || null,
            instrumentId: createRechargeDto.instrumentId || null,
            fecha_comprobante: createRechargeDto.fecha_comprobante
              ? new Date(createRechargeDto.fecha_comprobante)
              : null,
          },
        });
      } catch (error) {
        console.error("Error al crear la recarga manual:", error.message);
        return {
          data: null,
          message: "Error al crear la recarga manual",
        };
      }
    }

    return { data, message: "Recarga Creada Con éxito" };
  }

  async findAll(query: Record<string, any>) {
    const { status, userId, walletId, intermediario } = query;

    // Construir el filtro dinámicamente
    const filter: Record<string, any> = {};

    if (intermediario === "true" && userId) {
      filter.userId = Number(userId); // Asegúrate de convertirlo a número si es necesario
    }

    if (status) {
      filter.status = status;
    }

    if (walletId) {
      filter.walletId = Number(walletId); // Asegúrate de convertirlo a número si es necesario
    }

    const data = await this.prisma.recharge.findMany({
      where: filter,
      orderBy: {
        publicId: "desc",
      },
      include: {
        wallet: {
          include: {
            country: true,
          },
        },
      },
    });

    return { data, message: "Recargas obtenidas con éxito" };
  }

  async findByUser(user) {
    const data = await this.prisma.recharge.findMany({
      where: { userId: user.id },
      include: {
        wallet: {
          include: {
            country: true,
          },
        },
      },
    });

    return { data, message: "Recargas obtenidas con exito" };
  }

  async findOne(id) {
    const data = await this.prisma.recharge.findFirst({
      where: { id },
      include: { wallet: { include: { country: true } } },
    });

    return { data, message: "Recagar Obtenido con exito" };
  }

  async updateManual(id, updateRechargeDto) {
    return `This action updates a #${id} recharge`;
  }

  async updateAutomatic(data) {
    // Obtener información de la recarga
    const recharge = await this.prisma.recharge.findFirst({
      where: { id: data.rechargeId },
      include: { wallet: { include: { country: true } } },
    });

    if (!recharge) {
      throw new Error("Recarga no encontrada.");
    }

    // Preparar el payload para consultar el estado de la transacción
    const payload = {
      payment_token: recharge.nro_referencia, // Asumimos que `nro_referencia` tiene el token necesario
    };

    // Consultar el estado de la transacción
    try {
      const response = await axios.post(
        `https://api.floid.app/${recharge.wallet.country.abbreviation}/payments/check`,
        payload,
        {
          headers: {
            Authorization: `Bearer cc051fc11360e1e313ee4c99579648972ab3ca514b73d947cb13283caf81861d9c8eb1691e33e3c39ab881c180cef59391285ea5fcc4c77431b29d1d4f0b0aa1`,
            "Content-Type": "application/json",
          },
        }
      );

      const transactionStatus = response.data?.status; // Ajustar según la estructura de la respuesta de la API

      if (!transactionStatus) {
        throw new Error(
          "Estado de la transacción no disponible en la respuesta."
        );
      }
      if (response.data.status === "SUCCESS") {
        let newAmount =
          parseFloat(recharge.wallet.balance.toString()) +
          parseFloat(recharge.amount.toString());

        await this.prisma.wallet.update({
          where: { id: recharge.wallet.id },
          data: {
            balance: newAmount,
          },
        });

        await this.prisma.walletTransactions.create({
          data: {
            amount: recharge.amount,
            amount_old: recharge.wallet.balance,
            amount_new: newAmount,
            type: "DEPOSITO",
            walletId: recharge.wallet.id,
            description: "Deposito por Recarga: REC-2024-" + recharge.publicId,
          },
        });

        const updatedRecharge = await this.prisma.recharge.update({
          where: { id: data.rechargeId },
          data: {
            status: "COMPLETADA",
            pasarela_response: JSON.stringify(response.data),
          },
        });

        return updatedRecharge;
      } else {
        const updatedRecharge = await this.prisma.recharge.update({
          where: { id: data.rechargeId },
          data: {
            status: "CANCELADA",
            pasarela_response: JSON.stringify(response.data),
          },
        });

        return updatedRecharge;
      }
    } catch (error) {
      console.error(
        "Error al consultar el estado de la transacción:",
        error.message
      );

      // Registrar el error en la base de datos o manejarlo de forma adecuada
      await this.prisma.recharge.update({
        where: { id: data.rechargeId },
        data: {
          status: "CANCELADA",
          pasarela_response: JSON.stringify({ error: error.message }),
        },
      });

      throw new Error("Error al consultar el estado de la transacción.");
    }
  }

  async update(id, updateRecharge) {
    const data = await this.prisma.recharge.update({
      where: { id }, data: {
        status: updateRecharge.status,
        comentario: updateRecharge.comentario
      },
      include: { wallet: true }
    })

    if (updateRecharge.status === 'COMPLETADA') {
      let newAmount =
        parseFloat(data.wallet.balance.toString()) +
        parseFloat(data.amount.toString());

      await this.prisma.wallet.update({
        where: { id: data.wallet.id },
        data: {
          balance: newAmount,
        },
      });
    }

    return { data, message: 'Recarga Actuializada con exito' }
  }

  remove(id: number) {
    return `This action removes a #${id} recharge`;
  }
}
