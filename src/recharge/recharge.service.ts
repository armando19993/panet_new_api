import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.servise";
import axios from "axios";
import { NotificationService } from "src/notification/notification.service";
import * as crypto from 'crypto';
import { FlowApiService } from "src/flow-api/flow-api.service";

const apiKey = '7171E94F-2712-4D0F-BF7F-85AC9493L24F'; // Reemplaza con tu API Key de Flow
const secretKey = 'c27316db779ebf1f14bd83d8a3fb0bbb542dc71f'; // Reemplaza con tu Secret Key de Flow
const flowApiUrl = 'https://sandbox.flow.cl/api/payment/create';

@Injectable()
export class RechargeService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private flowApiService: FlowApiService
  ) { }

  async createAutomatic(data, user) {
    if (data.pasarela === 'Flow') {
      // Definir los parámetros necesarios para la solicitud
      const params = {
        commerceOrder: Math.floor(Math.random() * (2000 - 1100 + 1)) + 1100,
        amount: 1,
        subject: "prueba",
        email: "armandocamposf@gmail.com",
        currency: "PEN",
        paymentMethod: "11"
      };
      console.log(params)

      // Hacer la solicitud pasando los parámetros
      let data = this.flowApiService.createPaymentLink(params)
      return { data }
    }
    if (data.pasarela === 'Floid') {
      const countryLowercase = data.countryCode.toLowerCase();

      try {
        const payload: { amount: string; currency?: string } =
        {
          amount: data.amount.toString(),
        };

        // Agregar currency solo si el país es PE
        if (data.country === "PE") {
          payload.currency = "PEN";
        }

        const response = await axios.post(
          `https://api.floid.app/${countryLowercase}/payments/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer 786b64a673122aa03a5fa3909c6d100adad544fa3be9be01cfbb129cb11488d566a733bd98ca7204118baaaf3e086cd17b15ab969eb7b149084f10a898e9c2da`,
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
              walletId: data.walletId,
              amount: data.amount,
              type: "AUTOMATIZADO",
              status: "CREADA",
              comprobante: data.comprobante || null,
              comentario: data.comentario || null,
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
    }
  }

  async create(createRechargeDto, user, file) {
    let data = null;

    if (createRechargeDto.type === "AUTOMATIZADO") {
    } else {

      const fechaComprobante = new Date(createRechargeDto.fecha_comprobante)
      const validate = await this.prisma.recharge.findFirst({
        where: {
          nro_referencia: createRechargeDto.nro_referencia,
          fecha_comprobante: fechaComprobante
        }
      })

      if (validate) {
        throw new BadRequestException("Este numero de comprobante con esta fecha ya existe, contacta con administracion!")
      }

      const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;
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
          include: {
            user: true
          }
        });

        const instrument = await this.prisma.instrumentsClient.findFirst({ where: { id: createRechargeDto.instrumentId }, include: { user: true } })

        await this.prisma.colaEspera.upsert({
          where: {
            rechargeId_userId_type: {
              rechargeId: data.id,
              userId: instrument.user.id,
              type: "RECARGA",
            },
          },
          create: {
            rechargeId: data.id,
            userId: instrument.user.id,
            type: "RECARGA",
            status: "INICIADA",
          },
          update: {
            status: "INICIADA",
          },
        });

        const message = `*PANET APP:*\n\nHola, ${instrument.user.name}, tienes una RECARGA por aprobar:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;
        const message2 = `*PANET APP:*\n\nHola, ${user.name}}, has creado la recarga:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n\n *Comentario:* ${data.comentario}, la misma se encuentra en revision espera nuestra comunicacion. Cualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;


        const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${instrument.user.phone}&message=${encodeURIComponent(message)}&imageUrl=${fileUrl}`;
        const whatsappUrl2 = `https://api-whatsapp.paneteirl.store/send-message/text?number=${data.user.phone}&message=${encodeURIComponent(message2)}&imageUrl=${fileUrl}`;

        await axios.get(whatsappUrl);
        await axios.get(whatsappUrl2);

        this.notification.sendPushNotification(instrument.user.expoPushToken, 'Nueva Recarga Por Aprobar', `Tienes una nueva recarga por aprobar: REC-2025-${data.publicId}`, { screen: "ReciboRecarga", params: { rechargeId: data.id } })
        this.notification.sendPushNotification(data.user.expoPushToken, 'Nueva Recarga Pendiente', `Tienes una nueva recarga pendiente de aprobacion: REC-2025-${data.publicId}`, { screen: "ReciboRecarga", params: { rechargeId: data.id } })
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
      filter.userId = userId; // Asegúrate de convertirlo a número si es necesario
    }

    if (status) {
      filter.status = status;
    }

    if (walletId) {
      filter.walletId = walletId; // Asegúrate de convertirlo a número si es necesario
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
            user: true,
          },
        },
        instrument: {
          include: {
            user: true
          }
        }
      },
    });

    return { data, message: "Recargas obtenidas con éxito" };
  }

  async findByUser(user) {
    const data = await this.prisma.recharge.findMany({
      where: { userId: user.id },
      include: {
        user: true,
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
      include: {
        instrument: {
          include:
          {
            Client: true,
            user: true,
            accountType: true,
            country: true,
            bank: true
          }
        },
        Client: true,
        user: true,
        wallet: {
          include: {
            country: true
          }
        }
      },
    });

    return { data, message: "Recagar Obtenido con exito" };
  }

  async updateManual(id, updateRechargeDto) {
    const data = await this.prisma.recharge.findFirst({
      where: {
        id
      },
      include: {
        instrument: {
          include: {
            user: true
          }
        },
        wallet: {
          include: {
            country: true
          }
        },
        user: true
      }
    })

    if (updateRechargeDto.status === 'CANCELADA') {
      await this.prisma.recharge.update({
        where: { id },
        data: {
          status: 'CANCELADA',
          comentario: updateRechargeDto.comentario
        }
      })

      const message = `*PANET APP:*\n\nHola, ${data.user.name}, tu RECARGA:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n *Comentario:* ${data.comentario} ha sido rechazada por el siguiente motivo *${updateRechargeDto.comentario}*\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

      const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${data.user.phone}&message=${encodeURIComponent(message)}`;
      await axios.get(whatsappUrl);


      this.notification.sendPushNotification(data.user.expoPushToken, 'Estado de Recarga Actualizado', `Tu recarga: REC-2025-${data.publicId} ha cambiado a estado ${updateRechargeDto.status}`, { screen: "ReciboRecarga", params: { rechargeId: data.id } })
      return { data, message: 'Recarga Cancelada con exito' }
    }

    // sumar saldo al wallet de usuario que recarga
    await this.prisma.wallet.update({
      where: {
        id: data.wallet.id,
      },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    });

    await this.prisma.walletTransactions.create({
      data: {
        amount: data.amount,
        amount_new: parseFloat(data.wallet.balance.toString()) + parseFloat(data.amount.toString()),
        amount_old: data.wallet.balance,
        wallet: {
          connect: {
            id: data.wallet.id,
          },
        },
        description: "Recarga de Saldo REC-2025-" + data.publicId,
        type: "DEPOSITO"
      },
    })

    //  calcular saldos
    const profitPercentage = parseFloat(data.instrument.profit.toString());
    const profitAmount = (parseFloat(data.amount.toString()) * profitPercentage) / 100;
    const saldoPanet = parseFloat(data.amount.toString()) - profitAmount;

    //agregar saldo al wallet de recepcion PANET
    let walletRecepcion = await this.prisma.wallet.findFirst({
      where: {
        userId: data.instrument.user.id,
        countryId: data.instrument.countryId,
        type: 'RECEPCION'
      }
    })
    if (!walletRecepcion) {
      walletRecepcion = await this.prisma.wallet.create({
        data: {
          userId: data.instrument.user.id,
          countryId: data.instrument.countryId,
          type: 'RECEPCION',
          balance: saldoPanet
        }
      })
    }
    else {
      await this.prisma.wallet.update({
        where: { id: walletRecepcion.id }, data: {
          balance: {
            increment: saldoPanet
          }
        }
      })
    }

    await this.prisma.walletTransactions.create({
      data: {
        amount: saldoPanet,
        amount_new: parseFloat(walletRecepcion.balance.toString()) + saldoPanet,
        amount_old: walletRecepcion.balance,
        wallet: {
          connect: {
            id: walletRecepcion.id,
          },
        },
        description: "Recarga de Saldo REC-2025-" + data.publicId,
        type: "DEPOSITO"
      },
    })

    //Agregar saldo de ganancia al duseño de cuenta
    if (data.instrument.profit.toNumber() > 0) {
      let walletGananciaDueno = await this.prisma.wallet.findFirst({
        where: {
          userId: data.instrument.user.id,
          countryId: data.instrument.countryId,
          type: 'GANANCIAS'
        }
      })
      if (!walletGananciaDueno) {
        walletGananciaDueno = await this.prisma.wallet.create({
          data: {
            userId: data.instrument.user.id,
            countryId: data.instrument.countryId,
            type: 'GANANCIAS',
            balance: profitAmount
          }
        })
      } else {
        await this.prisma.wallet.update({
          where: {
            id: walletGananciaDueno.id,
          },
          data: {
            balance: {
              increment: profitAmount,
            },
          },
        });
      }



      await this.prisma.walletTransactions.create({
        data: {
          amount: profitAmount,
          amount_new: parseFloat(walletGananciaDueno.balance.toString()) + profitAmount,
          amount_old: walletGananciaDueno.balance,
          wallet: {
            connect: {
              id: walletGananciaDueno.id,
            },
          },
          description: "Ganancia por recarga de Saldo REC-2025-" + data.publicId,
          type: "DEPOSITO"
        },
      })

    }

    // actualizar recarga
    await this.prisma.recharge.update({
      where: { id },
      data: {
        status: 'COMPLETADA',
        gananciDespachador: profitAmount,
        saldoPanet
      }
    })

    try {
      await this.prisma.colaEspera.update({
        where: {
          rechargeId_userId_type: {
            rechargeId: data.id,
            userId: data.instrument.user.id,
            type: 'RECARGA',
          },
        },
        data: {
          status: 'CERRADA'
        }
      })
    }
    catch {
      console.log("No estamos actualizando esto correctamente")
    }

    const message = `*PANET APP:*\n\nHola, ${data.user.name}, tu RECARGA:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n *Comentario:* ${data.comentario} ha sido APROBADA con exito por un monto de ${data.amount} ${data.wallet.country.currency}, ya el saldo se encuentra disponible para su uso.\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

    const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${data.user.phone}&message=${encodeURIComponent(message)}`;
    await axios.get(whatsappUrl);

    return { data, message: 'Recarga Cancelada con exito' }
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
            description: "Deposito por Recarga: REC-2025-" + recharge.publicId,
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

  generateSignature(params, secretKey) {
    // Ordenar los parámetros alfabéticamente
    const sortedKeys = Object.keys(params).sort();

    // Concatenar nombres y valores de los parámetros
    const stringToSign = sortedKeys.map(key => key + params[key]).join('');

    // Firmar la cadena usando HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('hex');

    return signature;
  }
}
