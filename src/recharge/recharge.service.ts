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
import * as path from "path";
import * as archiver from "archiver";
import { ExportRechargeFilterDto } from "./dto/export-recharge.dto";
import { TelegramService } from "src/telegram/telegram.service";

@Injectable()
export class RechargeService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private flowApiService: FlowApiService,
    private whatsappService: WhatsappService,
    private movementsAccountJuridicService: MovementsAccountJuridicService,
    private readonly telegramService: TelegramService
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
      const adminChatId = 7677852749; // ID de chat de Telegram para alertas

      if (availableBalance < 10000) {
        const message = `⚠️ ALERTA CRÍTICA DE SALDO ⚠️\n\nEl saldo disponible en la cuenta bancaria es menor a 10,000 VES.\n\nSaldo actual: ${availableBalance.toLocaleString('es-VE')} VES\n\nPor favor, recargar la cuenta inmediatamente.`;
        await this.telegramService.sendMessage(adminChatId, message);
      } else if (availableBalance < 100000) {
        const message = `⚠️ ALERTA DE SALDO BAJO ⚠️\n\nEl saldo disponible en la cuenta bancaria es menor a 100,000 VES.\n\nSaldo actual: ${availableBalance.toLocaleString('es-VE')} VES\n\nSe recomienda recargar la cuenta pronto.`;
        await this.telegramService.sendMessage(adminChatId, message);
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

    if (instrument.user.telegram_chat_id) {
      await this.telegramService.sendMessage(Number(instrument.user.telegram_chat_id), message, fileUrl);
    }

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

        if (instrument.user.telegram_chat_id) {
          await this.telegramService.sendMessage(Number(instrument.user.telegram_chat_id), message, fileUrl);
        }

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
      const rateAmount = parseFloat(parseFloat(rate.amount.toString()).toFixed(2));
      const porcentajePasarela = parseFloat(((parseFloat(info.montoOrigen.toString()) * 2) / 100).toFixed(2));
      const saldoCalculo = parseFloat(parseFloat(info.montoOrigen.toString()).toFixed(2));

      const tipoCalculo = rate.type_profit;
      const porcentajeCalculo = origen[tipoCalculo];
      const porcentajeDelMonto = parseFloat(((parseFloat(info.montoOrigen.toString()) * porcentajeCalculo) / 100).toFixed(2));

      let montoDestino = 0;
      if (rate.origin.name !== 'VENEZUELA' && rate.origin.name !== 'COLOMBIA') {
        montoDestino = parseFloat((saldoCalculo * rateAmount).toFixed(2));
        console.log(
          "rateAmount", rateAmount,
          "saldoCalculo", saldoCalculo,
          "montoDestino", montoDestino
        )
        console.log("este es el monto que me da: ", montoDestino)
      } else {
        montoDestino = parseFloat((saldoCalculo * rateAmount).toFixed(2));
      }
      if (rate.origin.name === 'VENEZUELA' && rate.destination.name === 'COLOMBIA') {
        montoDestino = parseFloat((saldoCalculo * rateAmount).toFixed(2));
      }
      if (rate.origin.name === 'VENEZUELA' && rate.destination.name !== 'COLOMBIA') {
        montoDestino = parseFloat((saldoCalculo / rateAmount).toFixed(2));
      }
      if (rate.origin.name === 'COLOMBIA' && rate.destination.name === 'VENEZUELA') {
        montoDestino = parseFloat((saldoCalculo / rateAmount).toFixed(2));
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
      const montoOrigenEgreso = parseFloat(parseFloat(info.montoOrigen.toString()).toFixed(2));
      const balanceAnteriorRecarga = parseFloat(parseFloat(data.wallet.balance.toString()).toFixed(2));
      await this.prisma.wallet.update({
        where: { id: data.wallet.id },
        data: { balance: { decrement: montoOrigenEgreso } }
      });
      await this.prisma.walletTransactions.create({
        data: {
          amount: montoOrigenEgreso,
          amount_old: balanceAnteriorRecarga,
          amount_new: parseFloat((balanceAnteriorRecarga - montoOrigenEgreso).toFixed(2)),
          wallet: { connect: { id: data.wallet.id } },
          description: `Egreso por creación de transacción TRX-2025-${trans.publicId} (recarga)`,
          type: 'RETIRO',
        },
      });

      let colaEspera = null;
      let randomUser = null;

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
                  const transactionAmount = parseFloat(parseFloat(trans.montoDestino.toString()).toFixed(2));
                  console.log("AQUI ESTAMOS PROCESANDO Y ENTRANDO EN EL TRY")
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
                        const message = `🧾 Tu transaccion TRX-${updatedTransaction.publicId} ha sido completada con exito! Gracias por confiar en Panet Remesas!`;
                        console.log('📤 [RechargeService] Enviando comprobante de recarga full...');
                        const resultado = await this.sendWhatsAppNotification(recipient.phone, message, imageUrl);
                        console.log('📊 [RechargeService] Resultado del envío de comprobante:', {
                          transactionId: updatedTransaction.publicId,
                          exito: resultado,
                        });
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

      if ((trans.instrument.typeInstrument !== 'PAGO_MOVIL' && trans.destino.name === 'VENEZUELA') || trans.destino.name !== 'VENEZUELA') {
        console.log('transaction.destino.name: ' + trans.destino.name)
        console.log("esta entrando aqui")
        const dispatchers = [
          { country: 'PERU', id: '11062013-713a-4621-b27b-8c74ba1e88a0' },
          { country: 'USDT', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'COLOMBIA', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'ESTADOS UNIDOS', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'REPUBLICA DOMINICANA', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'EUROPA', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'ARGENTINA', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'CHILE', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'ECUADOR', id: 'aa23a5a6-b37c-4e1e-bd3e-4c2eda295df1' },
          { country: 'BRASIL', id: '81dee654-8ffd-4ea0-880f-f3c7effe1145' },
          { country: 'VENEZUELA', id: '11062013-713a-4621-b27b-8c74ba1e88a0' },
          { country: 'MEXICO', id: 'dbad2b11-d4eb-4ba2-bf64-6722912d6693' },
          { country: 'HONDURAS', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'URUGUAY', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
          { country: 'PANAMA', id: '75779a5d-1c01-4b18-9c43-3606b2913086' },
        ];

        const dispatcherConfig = dispatchers.find(d => d.country === trans.destino.name);

        if (dispatcherConfig && dispatcherConfig.id) {
          randomUser = await this.prisma.user.findUnique({
            where: { id: dispatcherConfig.id },
          });
        }

        if (!randomUser) {
          try {
            const message = `La transaccion N° ${trans.publicId} no pudo ser asignada para despacho procede a asignarla manualmente! `
            await this.telegramService.sendMessage(7677852749, message);
          } catch (error) {
            console.error('Error al enviar notificación de Telegram:', error);
          }
        } else {
          const colaEspera = await this.prisma.colaEspera.create({
            data: {
              type: 'TRANSACCION',
              userId: randomUser.id,
              transactionId: trans.id,
              status: 'INICIADA'
            }
          })

          try {
            const message = `Tienes una operacion por despachar, por favor realizada en menos de 5 minutos. Departamento de Tecnologia! `
            if (randomUser.telegram_chat_id) {
              await this.telegramService.sendMessage(randomUser.telegram_chat_id, message);
            }
          } catch (error) {
            console.error('Error al enviar notificación de Telegram:', error);
          }

          if (randomUser.expoPushToken) {
            try {
              this.notification.sendPushNotification(randomUser.expoPushToken, "Nueva Transaccion por Despachar", "Entra a tu aplicacion PANET ADMIN en el perfil DUEÑO DE CUENTA para aprobar la misma", {
                screen: "DespachoPage",
                params: { transactionId: trans.id }
              });
            } catch (error) {
              console.error('Error al enviar notificación push:', error);
            }

            try {
              const message = `La transaccion N° ${trans.publicId} esta pendiente de despacho! `
              if (randomUser.telegram_chat_id) {
                await this.telegramService.sendMessage(randomUser.telegram_chat_id, message);
              }
            } catch (error) {
              console.error('Error al enviar notificación de Telegram:', error);
            }
          }
        }
      }
    }

    let saldo = parseFloat(parseFloat(data.amount_total.toString()).toFixed(2));
    if (data.pasarela === 'Manual') {
      saldo = parseFloat(parseFloat(data.amount.toString()).toFixed(2));
    }

    await this.prisma.wallet.update({ where: { id: data.wallet.id }, data: { balance: { increment: saldo } } });
    await this.prisma.walletTransactions.create({
      data: {
        amount: saldo,
        amount_new: parseFloat((parseFloat(data.wallet.balance.toString()) + parseFloat(saldo.toString())).toFixed(2)),
        amount_old: parseFloat(parseFloat(data.wallet.balance.toString()).toFixed(2)),
        wallet: { connect: { id: data.wallet.id } },
        description: 'Recarga de Saldo REC-2025-' + data.publicId,
        type: 'DEPOSITO',
      },
    });

    const profitPercentage = parseFloat(data.instrument.profit.toString());
    const profitAmount = parseFloat(((parseFloat(data.amount.toString()) * profitPercentage) / 100).toFixed(2));
    const saldoPanet = parseFloat((parseFloat(data.amount.toString()) - profitAmount).toFixed(2));

    let walletRecepcion = await this.prisma.wallet.findFirst({ where: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'RECEPCION' } });
    if (!walletRecepcion) {
      walletRecepcion = await this.prisma.wallet.create({ data: { userId: data.instrument.user.id, countryId: data.instrument.countryId, type: 'RECEPCION', balance: saldoPanet } });
    } else {
      await this.prisma.wallet.update({ where: { id: walletRecepcion.id }, data: { balance: { increment: saldoPanet } } });
    }
    await this.prisma.walletTransactions.create({
      data: {
        amount: saldoPanet,
        amount_new: parseFloat((parseFloat(walletRecepcion.balance.toString()) + saldoPanet).toFixed(2)),
        amount_old: parseFloat(parseFloat(walletRecepcion.balance.toString()).toFixed(2)),
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
          amount_new: parseFloat((parseFloat(walletGananciaDueno.balance.toString()) + profitAmount).toFixed(2)),
          amount_old: parseFloat(parseFloat(walletGananciaDueno.balance.toString()).toFixed(2)),
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

        await this.telegramService.sendMessage(7677852749, `El cliente, ${recharge.wallet.user.name} ha generado una recarga por floid, hazle seguimiento! `);

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

  async exportRechargesWithComprobantes(filter: ExportRechargeFilterDto) {
    if (!filter?.instrumentIds?.length) {
      throw new BadRequestException('Debes enviar al menos un instrumentId');
    }

    const { startDate, endDate } = this.resolveDateRange(filter);
    const dateClause = this.buildDateClause(startDate, endDate);

    const recharges = await this.prisma.recharge.findMany({
      where: {
        instrumentId: { in: filter.instrumentIds },
        ...dateClause,
      },
      orderBy: { fecha_comprobante: 'asc' },
      include: {
        user: true,
      },
    });

    const zipUrl = await this.buildComprobantesZip(recharges);
    const summary = this.buildStatusSummary(recharges);

    return {
      data: recharges,
      zipUrl,
      summary,
      message: 'Recargas exportadas con éxito',
    };
  }

  private resolveDateRange(filter: ExportRechargeFilterDto) {
    const toDate = (value: string, endOfDay = false) => {
      if (!value) {
        throw new BadRequestException('Fecha inválida');
      }

      // Parsear fecha en formato YYYY-MM-DD como fecha local
      const parts = value.split('-');
      if (parts.length !== 3) {
        throw new BadRequestException(`Formato de fecha inválido: ${value}. Use YYYY-MM-DD`);
      }

      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new BadRequestException(`Fecha inválida: ${value}`);
      }

      const date = new Date(year, month, day);

      if (isNaN(date.getTime())) {
        throw new BadRequestException(`Fecha inválida: ${value}`);
      }

      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }

      return date;
    };

    const hasSingleDate = !!filter.date && !filter.startDate && !filter.endDate;

    if (hasSingleDate) {
      return {
        startDate: toDate(filter.date),
        endDate: toDate(filter.date, true),
      };
    }

    const startValue = filter.startDate ?? filter.date;
    const endValue = filter.endDate ?? startValue;

    if (!startValue || !endValue) {
      throw new BadRequestException('Debes enviar una fecha única o un rango (startDate / endDate)');
    }

    const startDate = toDate(startValue);
    const endDate = toDate(endValue, true);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('La fecha final no puede ser menor que la inicial');
    }

    return { startDate, endDate };
  }

  private buildDateClause(startDate: Date, endDate: Date) {
    return {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
  }

  private buildStatusSummary(recharges: any[]) {
    return recharges.reduce((acc, recharge) => {
      const status = recharge.status || 'SIN_STATUS';
      if (!acc[status]) {
        acc[status] = { count: 0, totalAmount: 0 };
      }
      const amount = recharge.amount ? parseFloat(recharge.amount.toString()) : 0;
      acc[status].count += 1;
      acc[status].totalAmount = parseFloat((acc[status].totalAmount + amount).toFixed(2));
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);
  }

  private async buildComprobantesZip(recharges: any[]): Promise<string | null> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const zipFileName = `comprobantes-${Date.now()}.zip`;
    const zipPath = path.join(uploadsDir, zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    let hasEntries = false;

    archive.pipe(output);

    for (const recharge of recharges) {
      if (![StatusRecharge.COMPLETADA, StatusRecharge.CANCELADA].includes(recharge.status) || !recharge.comprobante) {
        continue;
      }

      const source = await this.resolveComprobanteSource(recharge.comprobante);
      if (!source) {
        continue;
      }

      hasEntries = true;
      const fileName = this.buildComprobanteFileName(recharge, source.ext);
      const entryName = `${recharge.status}/${fileName}`;
      if (source.type === 'file') {
        archive.file(source.path, { name: entryName });
      } else {
        archive.append(source.buffer, { name: entryName });
      }
    }

    if (!hasEntries) {
      archive.append('No se encontraron comprobantes para los filtros seleccionados.', {
        name: 'SIN_COMPROBANTES.txt',
      });
    }

    const finalizePromise = new Promise<void>((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
    });

    archive.finalize();
    await finalizePromise;

    const baseUrl = process.env.BASE_URL || 'https://api.paneteirl.com';
    return `${baseUrl}/uploads/${zipFileName}`;
  }

  private buildComprobanteFileName(recharge: any, extension?: string) {
    const safeExtension = extension && extension.length > 0 ? extension : '.jpg';
    const identifier = recharge?.publicId ? `REC-${recharge.publicId}` : recharge.id;
    return `${identifier}${safeExtension}`;
  }

  private extractExtensionFromPath(value: string | undefined | null) {
    if (!value) {
      return '';
    }
    try {
      const parsedUrl = new URL(value);
      return path.extname(parsedUrl.pathname);
    } catch {
      return path.extname(value);
    }
  }

  private async resolveComprobanteSource(comprobante: string | null) {
    if (!comprobante) {
      return null;
    }

    const extension = this.extractExtensionFromPath(comprobante);

    if (comprobante.startsWith('http')) {
      try {
        const response = await axios.get<ArrayBuffer>(comprobante, { responseType: 'arraybuffer' });
        return {
          type: 'buffer' as const,
          buffer: Buffer.from(response.data),
          ext: extension,
        };
      } catch (error) {
        console.warn(
          'No se pudo descargar el comprobante remoto',
          comprobante,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const candidates = this.buildLocalPathCandidates(comprobante);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return {
          type: 'file' as const,
          path: candidate,
          ext: extension || path.extname(candidate),
        };
      }
    }

    console.warn('No se encontró el archivo de comprobante en el servidor', comprobante);
    return null;
  }

  private buildLocalPathCandidates(rawValue: string) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const candidates = new Set<string>();

    if (!rawValue.startsWith('http') && path.isAbsolute(rawValue)) {
      candidates.add(rawValue);
    }

    const cleaned = rawValue
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/+/, '');

    if (cleaned) {
      candidates.add(path.join(process.cwd(), cleaned));
      candidates.add(path.join(uploadsDir, cleaned.replace(/^uploads\//, '')));
    }

    candidates.add(path.join(uploadsDir, path.basename(cleaned || rawValue)));

    return Array.from(candidates);
  }

  remove(id: number) {
    return `This action removes a #${id} recharge`;
  }

}
