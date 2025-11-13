import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.servise";
import axios from "axios";
import { NotificationService } from "src/notification/notification.service";
import { FlowApiService } from "src/flow-api/flow-api.service";
import { WhatsappService } from "src/whatsapp/whatsapp.service";
import { StatusRecharge, StatusTransactionsTemporal, TypeRecharge } from "@prisma/client";
import { validate } from "class-validator";
import { MovementsAccountJuridicService } from "src/movements-account-juridic/movements-account-juridic.service";
import { generateTransactionImage } from "../transaction/image-generator";
import * as fs from "fs";

@Injectable()
export class RechargeService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private flowApiService: FlowApiService,
    private whatsappService: WhatsappService,
    private movementsAccountJuridicService: MovementsAccountJuridicService
  ) { }

  // Método utilitario para enviar notificaciones de WhatsApp de manera segura usando la nueva API
  private async sendWhatsAppNotification(phone: string, message: string, imageUrl?: string): Promise<boolean> {
    try {
      console.log('🔄 [RechargeService] Iniciando envío de WhatsApp:', {
        telefono: phone,
        tieneImagen: !!imageUrl,
        mediaUrl: imageUrl,
        mensaje: message?.substring(0, 50) + (message?.length > 50 ? '...' : ''),
      });
      
      const result = await this.whatsappService.sendMessageNewApi(phone, message, imageUrl);
      
      console.log('📊 [RechargeService] Resultado del envío:', {
        telefono: phone,
        exito: result,
        tieneImagen: !!imageUrl,
      });
      
      return result;
    } catch (error) {
      console.error('❌ [RechargeService] Error al enviar notificación de WhatsApp:', {
        telefono: phone,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // No propagamos el error para que no afecte el flujo principal
      return false;
    }
  }

  /**
   * Envía notificación de saldo bajo cuando se intenta hacer pago móvil
   */
  private async notifyLowBalance(availableBalance: number): Promise<void> {
    try {
      const adminPhone = '584148383419'; // Número de administrador
      
      if (availableBalance < 10000) {
        const message = `⚠️ ALERTA CRÍTICA DE SALDO ⚠️\n\nEl saldo disponible en la cuenta bancaria es menor a 10,000 VES.\n\nSaldo actual: ${availableBalance.toLocaleString('es-VE')} VES\n\nPor favor, recargar la cuenta inmediatamente.`;
        await this.sendWhatsAppNotification(adminPhone, message);
      } else if (availableBalance < 100000) {
        const message = `⚠️ ALERTA DE SALDO BAJO ⚠️\n\nEl saldo disponible en la cuenta bancaria es menor a 100,000 VES.\n\nSaldo actual: ${availableBalance.toLocaleString('es-VE')} VES\n\nSe recomienda recargar la cuenta pronto.`;
        await this.sendWhatsAppNotification(adminPhone, message);
      }
    } catch (error) {
      console.error('Error al enviar notificación de saldo bajo:', error);
    }
  }

  async createAutomatic(data, user) {
    if (data.pasarela === 'Flow') {
      const dataVar = data

      const rechargeAutomatic = await this.prisma.recharge.create({
        data: {
          user: {
            connect: { id: user.id }
          },
          wallet: {
            connect: { id: dataVar.walletId }
          },
          amount: parseFloat(dataVar.amount),
          type: "AUTOMATIZADO",
          status: "CREADA",
          comprobante: dataVar.comprobante || null,
          comentario: 'Flow',
          amount_comision: dataVar.amount_comision || null,
          amount_total: dataVar.amount_total || null,
          nro_referencia: "",
          fecha_comprobante: new Date(),
          pasarela: 'Flow'
        },
        include: {
          wallet: {
            include: {
              user: true
            }
          }
        }
      });

      let currency = ""
      if (dataVar.countryCode == "PE") {
        currency = "PEN"
      }
      else {
        currency = "CLP"
      }

      const params = {
        amount: dataVar.amount,
        commerceOrder: `${rechargeAutomatic.id}`,
        currency: currency,
        email: 'armandocamposf@gmail.com',
        subject: "Recarga PANET APP",
        paymentMethod: dataVar.id
      };

      try {
        let data = await this.flowApiService.createPaymentLink(params, currency)

        await this.prisma.recharge.update({
          where: {
            id: rechargeAutomatic.id
          },
          data: {
            nro_referencia: data.token
          }
        })

        await this.notification.sendPushNotification(
          rechargeAutomatic.wallet.user.expoPushToken,
          `Recarga Creada: REC-2025-${rechargeAutomatic.publicId}`,
          `Estimado cliente tu recarga REC-2025-${rechargeAutomatic.publicId}, ha sido creada con exito, procede por favor a realizar la misma, te notificaremos cuando tu saldo este disponible.`
        )

        await this.sendWhatsAppNotification('573207510120', `El cliente, ${rechargeAutomatic.wallet.user.name} ha generado una recarga por flow, hazle seguimiento! `);

        return { data, rechargeAutomatic, url: `${data.url}?token=${data.token}` }
      } catch (error) {
        console.log(error)
        return { data: null }
      }
    }

    if (data.pasarela === 'Floid') {
      const wallet = await this.prisma.wallet.findFirst({ where: { id: data.walletId } })
      const countryLowercase = data.countryCode.toLowerCase();

      try {
        const payload: { amount: string; currency?: string; consumer_id?: string; consumer_id_type?: string } =
        {
          amount: data.amount.toString(),
        };

        if (data.countryCode == "PE") {
          payload.currency = "PEN"
          if (wallet.consumer_id_type) {
            payload.consumer_id_type = wallet.consumer_id_type.toLowerCase()
          }
        }
        if (wallet.consumer_id) {
          payload.consumer_id = wallet.consumer_id
        }

        console.log(payload)

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

        console.log(response.data)

        const token = response.data.payment_token;

        try {
          data = await this.prisma.recharge.create({
            data: {
              user: {
                connect: { id: user.id }
              },
              wallet: {
                connect: { id: data.walletId }
              },
              amount: data.amount,
              type: "AUTOMATIZADO",
              status: "CREADA",
              comprobante: data.comprobante || null,
              comentario: data.comentario || null,
              amount_comision: data.amount_comision || null,
              amount_total: data.amount_total || null,
              nro_referencia: token,
              fecha_comprobante: new Date(),
              pasarela: 'Floid'
            },
            include: {
              wallet: {
                include: {
                  user: true
                }
              }
            }
          });

          await this.sendWhatsAppNotification(data.wallet.user.phone, `El cliente, ${data.wallet.user.name} ha generado una recarga por floid, hazle seguimiento! `);

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

  async createFull(data, user, file) {
    const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;
    // Validar duplicidad por nro_referencia y fecha_comprobante antes de crear
    if (data?.nro_referencia && data?.fecha_comprobante) {
      const fechaComprobante = new Date(data.fecha_comprobante);
      const existing = await this.prisma.recharge.findFirst({
        where: {
          nro_referencia: data.nro_referencia,
          fecha_comprobante: fechaComprobante
        }
      });
      if (existing) {
        throw new BadRequestException(`Esta recarga ya fue cargada: REC-2025-${existing.publicId}.`);
      }
    }
    //RECARGA 
    const recharge = await this.prisma.recharge.create({
      data: {
        userId: user.id,
        walletId: data.walletId,
        amount: data.montoOrigen,
        type: "MANUAL",
        status: "CREADA",
        comprobante: fileUrl || null,
        comentario: data.comentario || null,
        nro_referencia: data.nro_referencia || null,
        instrumentId: data.instrumentId || null,
        fecha_comprobante: data.fecha_comprobante
          ? new Date(data.fecha_comprobante)
          : null,
      },
      include: {
        user: true
      }
    })

    //Transaccion Temporal
    const transactionT = await this.prisma.transactionTemporal.create({
      data: {
        creadorId: user.id,
        walletId: data.walletId,
        clienteId: data.clienteId,
        instrumentId: data.instrumentPagoId,
        origenId: data.origenId,
        destinoId: data.destinoId,
        montoOrigen: data.montoOrigen,
        status: StatusTransactionsTemporal.CREADA,
        recharge: {
          connect: {
            id: recharge.id
          }
        },
      }
    })

    const instrument = await this.prisma.instrumentsClient.findFirst({ where: { id: data.instrumentId }, include: { user: true } })

    await this.prisma.colaEspera.upsert({
      where: {
        rechargeId_userId_type: {
          rechargeId: recharge.id,
          userId: instrument.user.id,
          type: "RECARGA",
        },
      },
      create: {
        rechargeId: recharge.id,
        userId: instrument.user.id,
        type: "RECARGA",
        status: "INICIADA",
      },
      update: {
        status: "INICIADA",
      },
    });

    console.log(instrument)

    const message = `*PANET APP:*\n\nHola, ${instrument.user.name}, tienes una RECARGA por aprobar:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

    await this.sendWhatsAppNotification(instrument.user.phone, message, fileUrl);

    this.notification.sendPushNotification(instrument.user.expoPushToken, 'Nueva Recarga Por Aprobar', `Tienes una nueva recarga por aprobar: REC-2025-${data.publicId}`, { screen: "ReciboRecarga", params: { rechargeId: data.id } })
    return {
      data: {
        recharge,
        transactionT
      },
      message: 'Transaccion Temporal Creada con exito!'
    }
  }

  async create(createRechargeDto, user, file) {
    let data = null;

    if (createRechargeDto.type === "AUTOMATIZADO") {
      throw new BadRequestException("No se puede crear una recarga automática manualmente");
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
      // Sanitizar montos: convertir a número y manejar valores no numéricos
      const parsedAmount = Number(createRechargeDto.amount);
      if (!Number.isFinite(parsedAmount)) {
        throw new BadRequestException('Monto inválido');
      }

      const parsedComision = Number(createRechargeDto.amount_comision);
      const safeComision = Number.isFinite(parsedComision) ? parsedComision : 0;

      const parsedTotal = Number(createRechargeDto.amount_total);
      const safeTotal = Number.isFinite(parsedTotal) ? parsedTotal : 0;
      try {
        data = await this.prisma.recharge.create({
          data: {
            amount: parsedAmount,
            type: "MANUAL",
            status: "CREADA",
            comprobante: fileUrl || null,
            pasarela: createRechargeDto.pasarela || null,
            amount_comision: safeComision,
            amount_total: safeTotal,
            comentario: createRechargeDto.comentario || null,
            nro_referencia: createRechargeDto.nro_referencia || null,
            fecha_comprobante: createRechargeDto.fecha_comprobante
              ? new Date(createRechargeDto.fecha_comprobante)
              : null,
            user: {
              connect: { id: user.id }
            },
            wallet: {
              connect: { id: createRechargeDto.walletId }
            },
            instrument: createRechargeDto.instrumentId ? {
              connect: { id: createRechargeDto.instrumentId }
            } : undefined
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

        await this.sendWhatsAppNotification(instrument.user.phone, message, fileUrl);
        console.log("se eejcuto 1")
        await this.sendWhatsAppNotification(data.user.phone, message2, fileUrl);
        console.log("se eejcuto 2")

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

    const filter: Record<string, any> = {};

    if (userId) {
      filter.userId = userId;
    }

    if (status) {
      filter.status = status;
    }

    if (walletId) {
      filter.walletId = walletId;
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
            country: true,
            user: true
          }
        }
      },
    });

    return { data, message: "Recagar Obtenido con exito" };
  }

  async updateManual(id, updateRechargeDto) {
    const data = await this.prisma.recharge.findFirst({
      where: { id },
      include: {
        instrument: { include: { user: true } },
        wallet: { include: { country: true } },
        user: true,
        TransactionTemporal: true,
      },
    });

    // Evitar cambios de estado si la recarga ya no está en estado 'CREADA'
    if (data && data.status !== 'CREADA') {
      return { data, message: 'La recarga ya fue procesada y no puede cambiar de estado.' };
    }

    if (updateRechargeDto.status === 'CANCELADA') {
      const updateRecharge = await this.prisma.recharge.update({
        where: { id },
        data: { status: 'CANCELADA', comentario: updateRechargeDto.comentario },
        include: { TransactionTemporal: true },
      });

      const message = `*PANET APP:*\n\nHola, ${data.user.name}, tu RECARGA:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n *Comentario:* ${data?.comentario ? data.comentario : '*Sin Comentario*'} ha sido rechazada por el siguiente motivo *${updateRechargeDto.comentario}*\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;

      await this.sendWhatsAppNotification(data.user.phone, message);
      this.notification.sendPushNotification(
        data.user.expoPushToken,
        'Estado de Recarga Actualizado',
        `Tu recarga: REC-2025-${data.publicId} ha cambiado a estado ${updateRechargeDto.status}`,
        { screen: 'ReciboRecarga', params: { rechargeId: data.id } }
      );

      if (updateRecharge.TransactionTemporal) {
        await this.prisma.transactionTemporal.update({
          where: { id: updateRecharge.TransactionTemporal[0].id },
          data: { status: 'RECHAZADA' },
        });
      }

      await this.prisma.colaEspera.deleteMany({ where: { rechargeId: id, type: 'RECARGA' } });
      return { data, message: 'Recarga Cancelada con exito' };
    }

    if (data.TransactionTemporal[0]) {
      await this.prisma.transactionTemporal.update({
        where: { id: data.TransactionTemporal[0].id },
        data: { status: StatusTransactionsTemporal.APROBADA },
      });

      const info = data.TransactionTemporal[0];
      const origen = await this.prisma.country.findUnique({ where: { id: info.origenId } });
      const destino = await this.prisma.country.findUnique({ where: { id: info.destinoId } });
      const rate = await this.prisma.rate.findFirst({
        where: { originId: info.origenId, destinationId: info.destinoId },
        include: { origin: true, destination: true },
      });
      const rateAmount = parseFloat(rate.amount.toString());
      const porcentajePasarela = parseFloat(((parseFloat(info.montoOrigen.toString()) * 2) / 100).toFixed(3));
      const saldoCalculo = parseFloat(info.montoOrigen.toString());

      const tipoCalculo = rate.type_profit;
      const porcentajeCalculo = origen[tipoCalculo];
      const porcentajeDelMonto = parseFloat(((parseFloat(info.montoOrigen.toString()) * porcentajeCalculo) / 100).toFixed(3));

      let montoDestino = 0;
      if (rate.origin.name !== 'VENEZUELA' && rate.origin.name !== 'COLOMBIA') {
        montoDestino = saldoCalculo * rateAmount;
      } else {
        montoDestino = saldoCalculo * rateAmount;
      }
      if (rate.origin.name === 'VENEZUELA' && rate.destination.name === 'COLOMBIA') {
        montoDestino = saldoCalculo * rateAmount;
      }
      if (rate.origin.name === 'VENEZUELA' && rate.destination.name !== 'COLOMBIA') {
        montoDestino = saldoCalculo / rateAmount;
      }
      if (rate.origin.name === 'COLOMBIA' && rate.destination.name === 'VENEZUELA') {
        montoDestino = saldoCalculo / rateAmount;
      }

      const trans = await this.prisma.transaction.create({
        data: {
          creador: { connect: { id: info.creadorId } },
          wallet: { connect: { id: info.walletId } },
          cliente: info.clienteId ? { connect: { id: info.clienteId } } : undefined,
          instrument: { connect: { id: info.instrumentId } },
          origen: { connect: { id: info.origenId } },
          destino: { connect: { id: info.destinoId } },
          montoOrigen: info.montoOrigen,
          montoDestino: montoDestino,
          montoTasa: rateAmount,
          monedaOrigen: origen.currency,
          monedaDestino: destino.currency,
          montoComisionPasarela: porcentajePasarela,
          gananciaIntermediario: 0,
          gananciaPanet: porcentajeDelMonto,
          gastosAdicionales: 0,
          nro_referencia: '0',
          comprobante: '0',
          observacion: 'ninguna',
          status: 'CREADA',
        },
        include: {
          wallet: { include: { country: true } },
          instrument: { include: { bank: true } },
          origen: true,
          destino: true,
        },
      });

      // Restar montoOrigen del wallet de recarga al crear la transacción temporal
      const montoOrigenEgreso = parseFloat(info.montoOrigen.toString());
      const balanceAnteriorRecarga = parseFloat(data.wallet.balance.toString());
      await this.prisma.wallet.update({
        where: { id: data.wallet.id },
        data: { balance: { decrement: montoOrigenEgreso } }
      });
      await this.prisma.walletTransactions.create({
        data: {
          amount: montoOrigenEgreso,
          amount_old: balanceAnteriorRecarga,
          amount_new: balanceAnteriorRecarga - montoOrigenEgreso,
          wallet: { connect: { id: data.wallet.id } },
          description: `Egreso por creación de transacción TRX-2025-${trans.publicId} (recarga)`,
          type: 'RETIRO',
        },
      });

      let colaEspera = null;
      let randomUser = null;
      if (trans.instrument.typeInstrument !== 'PAGO_MOVIL' ) {
        const roles = ['DESPACHADOR'];
        const duenos = await this.prisma.user.findMany({
          where: {
            roles: { some: { role: { name: { in: roles } } } },
            status_despachador: 'ACTIVO',
            wallets: { some: { countryId: trans.wallet.country.id, type: 'RECEPCION', status: 'ACTIVO' } },
          },
          include: {
            wallets: true,
            clientes: true,
            referrals: true,
            referrer: true,
            roles: { include: { role: true } },
          },
        });

        if (duenos.length === 0) {
          const message = `La transaccion N° ${trans.publicId} no pudo ser asignada para despacho procede a asignarla manualmente! `;
          await this.sendWhatsAppNotification('573207510120', message);
        } else {
          randomUser = duenos.length > 0 ? duenos[Math.floor(Math.random() * duenos.length)] : null;
          colaEspera = await this.prisma.colaEspera.create({
            data: { type: 'TRANSACCION', userId: randomUser.id, transactionId: trans.id, status: 'INICIADA' },
          });
        }
      }

      if (trans.instrument.typeInstrument === 'PAGO_MOVIL' && trans.destino.name === 'VENEZUELA') {
        // Validar balance disponible antes de procesar el pago móvil
        try {
          const balanceInfo = await this.movementsAccountJuridicService.getAccountBalance();
          const availableBalance = parseFloat(balanceInfo.availableBalance.toString());
          
          // Enviar notificación si el saldo es bajo
          await this.notifyLowBalance(availableBalance);
          
          if (availableBalance <= 10000) {
            await this.prisma.transaction.update({
              where: { id: trans.id },
              data: {
                status: 'ERROR',
                errorResponse: { 
                  message: 'Saldo insuficiente en cuenta bancaria',
                  availableBalance: balanceInfo.availableBalance,
                  requiredMinimum: 10000
                }
              }
            });
          } else {
            // Continuar con el proceso si el balance es suficiente
            let numeroReferencia = trans.publicId.toString();
            if (numeroReferencia.length < 6) {
              const randomPrefix = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
              numeroReferencia = randomPrefix.toString() + numeroReferencia;
            }
            numeroReferencia = numeroReferencia.substring(0, 6);

            const safeToString = (value: unknown, field: string) => {
              if (value === null || value === undefined) {
                throw new Error(field);
              }
              return value.toString();
            };

            let jsonBDV: Record<string, string> | null = null;
            try {
              jsonBDV = {
                numeroReferencia: numeroReferencia,
                montoOperacion: safeToString(trans.montoDestino, 'montoDestino'),
                nacionalidadDestino: 'V',
                cedulaDestino: safeToString(trans.instrument?.document, 'instrument.document'),
                telefonoDestino: safeToString(trans.instrument?.accountNumber, 'instrument.accountNumber'),
                bancoDestino: safeToString(trans.instrument?.bank?.code, 'instrument.bank.code'),
                moneda: 'VES',
                conceptoPago: `CONECTA CONSULTING ${trans.publicId}`,
              };
            } catch (formatError) {
              const missingField = formatError instanceof Error ? formatError.message : 'desconocido';
              await this.prisma.transaction.update({
                where: { id: trans.id },
                data: {
                  status: 'ERROR',
                  errorResponse: { message: 'Existe un error al formatear los datos del json para el pago movil', details: { field: missingField } },
                },
              });
            }

            if (jsonBDV) {
              try {
                const response = await axios.post(process.env.BANVENEZ_API_URL, jsonBDV, {
                  headers: { 'x-api-key': process.env.BANVENEZ_API_KEY, 'Content-Type': 'application/json' },
                });

                if (response.data && response.data.code === 1000 && response.data.message === 'Transaccion realizada') {
                  if (colaEspera) {
                    await this.prisma.colaEspera.update({ where: { id: colaEspera.id }, data: { status: 'CERRADA' } });
                  }
                  const updatedTransaction = await this.prisma.transaction.update({
                    where: { id: trans.id },
                    data: { status: 'COMPLETADA', nro_referencia: response.data.referencia },
                    include: {
                      creador: true,
                      cliente: true,
                      destino: true,
                      instrument: {
                        include: {
                          bank: true
                        }
                      }
                    }
                  });
                  const transactionAmount = parseFloat(trans.montoDestino.toString());
                  await this.movementsAccountJuridicService.create({ amount: transactionAmount.toString(), type: 'EGRESO', description: `Egreso por transacción TRX-2025-${trans.publicId} (recarga)` });

                  // Generar y enviar comprobante
                  try {
                    console.log('🔄 [RechargeService] Iniciando generación de comprobante (recarga full):', {
                      transactionId: updatedTransaction.publicId,
                      status: updatedTransaction.status,
                    });

                    const logoResponse = await axios.get('https://panel.paneteirl.com/logo_conecta.png', { responseType: 'arraybuffer' });
                    const logoDataUri = `data:image/png;base64,${Buffer.from(logoResponse.data).toString('base64')}`;

                    console.log('📸 [RechargeService] Generando imagen del comprobante...');
                    const imageDataUri = await generateTransactionImage(updatedTransaction, logoDataUri);
                    const imageBuffer = Buffer.from(imageDataUri.split(',')[1], 'base64');

                    const imageFileName = `comprobante-TRX-${updatedTransaction.publicId}.png`;
                    const imagePath = `${process.cwd()}/uploads/${imageFileName}`;
                    fs.writeFileSync(imagePath, imageBuffer);

                    const imageUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${imageFileName}`;

                    console.log('🧾 [RechargeService] Comprobante generado para transacción:', {
                      transactionId: updatedTransaction.publicId,
                      imageFileName: imageFileName,
                      imagePath: imagePath,
                      imageUrl: imageUrl,
                      archivoExiste: fs.existsSync(imagePath),
                      tamañoArchivo: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0,
                    });

                    const recipient = updatedTransaction.cliente || updatedTransaction.creador;
                    console.log('🔍 [RechargeService] Verificando destinatario:', {
                      transactionId: updatedTransaction.publicId,
                      tieneCliente: !!updatedTransaction.cliente,
                      tieneCreador: !!updatedTransaction.creador,
                      tieneRecipient: !!recipient,
                    });

                    if (recipient) {
                      console.log('👤 [RechargeService] Preparando envío de comprobante a:', {
                        transactionId: updatedTransaction.publicId,
                        recipientId: recipient.id,
                        recipientName: recipient.name,
                        recipientPhone: recipient.phone,
                        tieneTelefono: !!recipient.phone,
                      });

                      if (!recipient.phone) {
                        console.error('❌ [RechargeService] ERROR: El destinatario no tiene teléfono:', {
                          transactionId: updatedTransaction.publicId,
                          recipientId: recipient.id,
                          recipientName: recipient.name,
                        });
                      } else {
                        const message = `🧾 Comprobante de tu transacción TRX-${updatedTransaction.publicId}\n\nPuedes verlo aquí:\n${imageUrl}`;
                        console.log('📤 [RechargeService] Enviando comprobante de recarga full...');
                        const resultado = await this.sendWhatsAppNotification(recipient.phone, message, imageUrl);
                        console.log('📊 [RechargeService] Resultado del envío de comprobante:', {
                          transactionId: updatedTransaction.publicId,
                          exito: resultado,
                        });
                      }

                      // Enviar mensaje de la rifa hasta el 13/11/2025
                      try {
                        const today = new Date();
                        const raffleEndDate = new Date('2025-11-13T23:59:59');
                        if (today <= raffleEndDate) {
                         const raffleMessage = `✨ ¡La Suerte te Sonríe con Gana con Panet! ✨\n\nQueremos que sientas la emoción de ganar.\n\nParticipa en nuestras rifas exclusivas o juega a tus animalitos favoritos 🐯🍀 de forma sencilla, segura y muy divertida. ¡Tienes la oportunidad de ganar grandes premios todos los días!\n\n📲 Para unirte a la emoción o comprar tus jugadas, contáctanos: +51 921 276 727.\n\n💬 Estamos listos para atenderte con gusto. ¡Mucha suerte!`;
                          const raffleImageUrl = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/RIFA%20PREMIO%20MAYOR%202.jpg';
                          await this.sendWhatsAppNotification(recipient.phone, raffleMessage, raffleImageUrl);
                          const raffleUrl2 = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/Lista%20de%20paises%20cuadro.jpg';
                          await this.sendWhatsAppNotification(recipient.phone, "", raffleUrl2);
                        }
                      } catch (error) {
                        console.error('Error al enviar mensaje de la rifa:', error);
                      }
                    } else {
                      console.warn('⚠️ [RechargeService] No se encontró destinatario para enviar comprobante:', {
                        transactionId: updatedTransaction.publicId,
                        tieneCliente: !!updatedTransaction.cliente,
                        tieneCreador: !!updatedTransaction.creador,
                      });
                    }
                  } catch (error) {
                    console.error('❌ [RechargeService] ERROR generando o enviando comprobante (recarga full):', {
                      transactionId: updatedTransaction?.publicId,
                      error: error instanceof Error ? error.message : 'Error desconocido',
                      stack: error instanceof Error ? error.stack : undefined,
                    });
                  }
                } else {
                  await this.prisma.transaction.update({ where: { id: trans.id }, data: { status: 'ERROR', errorResponse: response.data } });
                }
              } catch (error) {
                console.error('Error al llamar API de Banvenez:', error);
                const errorPayload = axios.isAxiosError(error) ? (error.response?.data ?? { message: error.message }) : { message: (error as Error).message };
                await this.prisma.transaction.update({ where: { id: trans.id }, data: { status: 'ERROR', errorResponse: errorPayload } });
              }
            }
          }
        } catch (balanceError) {
          console.error('Error al consultar balance de cuenta bancaria:', balanceError);
          await this.prisma.transaction.update({
            where: { id: trans.id },
            data: {
              status: 'ERROR',
              errorResponse: { 
                message: 'Error al consultar saldo de cuenta bancaria',
                error: balanceError instanceof Error ? balanceError.message : 'Error desconocido'
              }
            }
          });
        }
      }
    }

    let saldo = data.amount_total;
    if (data.pasarela === 'Manual') {
      saldo = data.amount;
    }

    await this.prisma.wallet.update({ where: { id: data.wallet.id }, data: { balance: { increment: saldo } } });
    await this.prisma.walletTransactions.create({
      data: {
        amount: saldo,
        amount_new: parseFloat(data.wallet.balance.toString()) + parseFloat(saldo.toString()),
        amount_old: data.wallet.balance,
        wallet: { connect: { id: data.wallet.id } },
        description: 'Recarga de Saldo REC-2025-' + data.publicId,
        type: 'DEPOSITO',
      },
    });

    const profitPercentage = parseFloat(data.instrument.profit.toString());
    const profitAmount = (parseFloat(data.amount.toString()) * profitPercentage) / 100;
    const saldoPanet = parseFloat(data.amount.toString()) - profitAmount;

    let walletRecepcion = await this.prisma.wallet.findFirst({ where: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'RECEPCION' } });
    if (!walletRecepcion) {
      walletRecepcion = await this.prisma.wallet.create({ data: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'RECEPCION', balance: saldoPanet } });
    } else {
      await this.prisma.wallet.update({ where: { id: walletRecepcion.id }, data: { balance: { increment: saldoPanet } } });
    }
    await this.prisma.walletTransactions.create({
      data: {
        amount: saldoPanet,
        amount_new: parseFloat(walletRecepcion.balance.toString()) + saldoPanet,
        amount_old: walletRecepcion.balance,
        wallet: { connect: { id: walletRecepcion.id } },
        description: 'Recarga de Saldo REC-2025-' + data.publicId,
        type: 'DEPOSITO',
      },
    });

    if (data.instrument.profit.toNumber() > 0) {
      let walletGananciaDueno = await this.prisma.wallet.findFirst({ where: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'GANANCIAS' } });
      if (!walletGananciaDueno) {
        walletGananciaDueno = await this.prisma.wallet.create({ data: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'GANANCIAS', balance: profitAmount } });
      } else {
        await this.prisma.wallet.update({ where: { id: walletGananciaDueno.id }, data: { balance: { increment: profitAmount } } });
      }
      await this.prisma.walletTransactions.create({
        data: {
          amount: profitAmount,
          amount_new: parseFloat(walletGananciaDueno.balance.toString()) + profitAmount,
          amount_old: walletGananciaDueno.balance,
          wallet: { connect: { id: walletGananciaDueno.id } },
          description: 'Ganancia por recarga de Saldo REC-2025-' + data.publicId,
          type: 'DEPOSITO',
        },
      });
    }

    await this.prisma.recharge.update({ where: { id }, data: { status: 'COMPLETADA', gananciDespachador: profitAmount, saldoPanet } });
    try {
      await this.prisma.colaEspera.updateMany({ where: { rechargeId: data.id, type: 'RECARGA' }, data: { status: 'CERRADA' } });
    } catch {
      console.log('No estamos actualizando esto correctamente');
    }

    const message = `*PANET APP:*\n\nHola, ${data.user.name}, tu RECARGA:\n\n*Recarga ID:* REC-2025-${data.publicId}\n*Case Id:* ${data.id}\n *Comentario:* ${data.comentario} ha sido APROBADA con exito por un monto de ${data.amount} ${data.wallet.country.currency}, ya el saldo se encuentra disponible para su uso.\nCualquier consulta o problema con nuestros sistemas o apps móviles, escribe al número de soporte: +51 929 990 656.`;
    await this.sendWhatsAppNotification(data.user.phone, message);
    return { data, message: 'Recarga Cancelada con exito' };
  }

  async updateAutomatic(data) {
    const recharge = await this.prisma.recharge.findFirst({
      where: { id: data.rechargeId },
      include: { wallet: { include: { country: true, user: true } } },
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
            Authorization: `Bearer 786b64a673122aa03a5fa3909c6d100adad544fa3be9be01cfbb129cb11488d566a733bd98ca7204118baaaf3e086cd17b15ab969eb7b149084f10a898e9c2da`,
            "Content-Type": "application/json",
          },
        }
      );

      const transactionStatus = response.data?.status;

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

        await this.sendWhatsAppNotification('573207510120', `El cliente, ${recharge.wallet.user.name} ha generado una recarga por floid, hazle seguimiento! `);

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
      include: { wallet: true, TransactionTemporal: true }
    })

    console.log(data)

    if (updateRecharge.status === 'COMPLETADA') {
      let newAmount =
        parseFloat(data.wallet.balance.toString()) +
        parseFloat(data.amount.toString());
      console.log(newAmount)
      console.log("recarga completada")
      await this.prisma.wallet.update({
        where: { id: data.wallet.id },
        data: {
          balance: newAmount,
        },
      });

      if (data.TransactionTemporal) {
        await this.prisma.transactionTemporal.update({
          where: {
            id: data.TransactionTemporal[0].id
          },
          data: {
            status: StatusTransactionsTemporal.APROBADA
          }
        })

        const info = data.TransactionTemporal[0]
        const origen = await this.prisma.country.findUnique({ where: { id: info.origenId } })
        const destino = await this.prisma.country.findUnique({ where: { id: info.destinoId } })
        const rate = await this.prisma.rate.findFirst({
          where: {
            originId: info.origenId,
            destinationId: info.destinoId
          },
          include: {
            origin: true,
            destination: true
          }
        })
        const rateAmount = parseFloat(rate.amount.toString());
        const porcentajePasarela = parseFloat(((parseFloat(info.montoOrigen.toString()) * 2) / 100).toFixed(3));
        const saldoCalculo = parseFloat(info.montoOrigen.toString()) - porcentajePasarela

        const tipoCalculo = rate.type_profit;
        const porcentajeCalculo = origen[tipoCalculo];
        const porcentajeDelMonto = parseFloat(((parseFloat(info.montoOrigen.toString()) * porcentajeCalculo) / 100).toFixed(3));

        let montoDestino = 0

        if (rate.origin.name !== "VENEZUELA" && rate.origin.name !== "COLOMBIA") {
          montoDestino = saldoCalculo * rateAmount;
        } else {
          montoDestino = saldoCalculo * rateAmount;
        }

        if (rate.origin.name === "VENEZUELA" && rate.destination.name === "COLOMBIA") {
          montoDestino = saldoCalculo * rateAmount;
        }
        if (rate.origin.name === "VENEZUELA" && rate.destination.name !== "COLOMBIA") {
          montoDestino = saldoCalculo / rateAmount;
        }

        if (rate.origin.name === "COLOMBIA" && rate.destination.name === "VENEZUELA") {
          montoDestino = saldoCalculo / rateAmount;
        }


        //crear la transaccion
        await this.prisma.transaction.create({
          data: {
            creador: {
              connect: { id: info.creadorId }
            },
            wallet: {
              connect: { id: info.walletId }
            },
            cliente: info.clienteId ? {
              connect: { id: info.clienteId }
            } : undefined,
            instrument: {
              connect: { id: info.instrumentId }
            },
            origen: {
              connect: { id: info.origenId }
            },
            destino: {
              connect: { id: info.destinoId }
            },
            montoOrigen: info.montoOrigen,
            montoDestino: montoDestino,
            montoTasa: rateAmount,
            monedaOrigen: origen.currency,
            monedaDestino: destino.currency,
            montoComisionPasarela: porcentajePasarela,
            gananciaIntermediario: 0,
            gananciaPanet: porcentajeDelMonto,
            gastosAdicionales: 0,
            nro_referencia: '0',
            comprobante: '0',
            observacion: 'ninguna',
            status: "CREADA",
          }
        })
      }
    } else {
      console.log(data.TransactionTemporal)
      await this.prisma.transactionTemporal.update({
        where: {
          id: data.TransactionTemporal[0].id
        },
        data: {
          status: StatusTransactionsTemporal.RECHAZADA
        }
      })
    }

    return { data, message: 'Recarga Actuializada con exito' }
  }

  async responseFlow(data) {
    let token = data.token

    const response = await this.flowApiService.checkPaymentStatus(token, 'PEN')
    let status = null
    if (response.status === 2) {
      status = 'COMPLETADA'
    } else {
      status = 'CANCELADA'
    }

    const recharge = await this.prisma.recharge.update({
      where: {
        id: response.commerceOrder
      },
      data: {
        status,
        pasarela_response: JSON.stringify(response)
      },
      include: {
        wallet: {
          include: {
            user: true
          }
        }
      }
    })

    this.notification.sendPushNotification(
      recharge.wallet.user.expoPushToken,
      `Cambio de Estado en tu recarga REC-2025-${recharge.publicId}`,
      `Estimado cliente tu recarga en nuestra app PANET se ecuentra en estado ${status}`
    )

    if (response.status === 2) {
      await this.prisma.wallet.update({
        where: { id: recharge.walletId },
        data: {
          balance: {
            increment: recharge.amount_total,
          },
        },
      });

      await this.prisma.walletTransactions.create({
        data: {
          amount: recharge.amount_total,
          amount_new: parseFloat(recharge.wallet.balance.toString()) + parseFloat(recharge.amount_total.toString()),
          amount_old: recharge.wallet.balance,
          wallet: {
            connect: {
              id: recharge.walletId,
            },
          },
          description: "Deposito por Recarga: REC-2025-" + recharge.publicId,
          type: "DEPOSITO"
        },
      })
    }

    return { data: recharge, message: 'Recarga Actualizada con exito' }
  }

  remove(id: number) {
    return `This action removes a #${id} recharge`;
  }

}
