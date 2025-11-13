import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SendDirectPagoMovilDto } from './dto/send-direct-pago-movil.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import { NotificationService } from 'src/notification/notification.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { MovementsAccountJuridicService } from 'src/movements-account-juridic/movements-account-juridic.service';
import axios from 'axios';
import { time } from 'console';
import { generateTransactionPdf } from './pdf-generator';
import { generateTransactionImage } from './image-generator';
import * as fs from 'fs';

@Injectable()
export class TransactionService {

  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private whatsappService: WhatsappService,
    private movementsAccountJuridicService: MovementsAccountJuridicService
  ) { }

  /**
   * Método reutilizable para enviar mensajes de WhatsApp usando la nueva API
   * Puede ser usado tanto en transacciones como en recargas
   */
  async sendWhatsAppMessage(phone: string, caption: string, mediaUrl?: string): Promise<boolean> {
    try {
      console.log('🔄 [TransactionService] Iniciando envío de WhatsApp:', {
        telefono: phone,
        tieneImagen: !!mediaUrl,
        mediaUrl: mediaUrl,
        mensaje: caption?.substring(0, 50) + (caption?.length > 50 ? '...' : ''),
      });

      const result = await this.whatsappService.sendMessageNewApi(phone, caption, mediaUrl);

      console.log('📊 [TransactionService] Resultado del envío:', {
        telefono: phone,
        exito: result,
        tieneImagen: !!mediaUrl,
      });

      return result;
    } catch (error) {
      console.error('❌ [TransactionService] Error al enviar mensaje de WhatsApp:', {
        telefono: phone,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
        await this.sendWhatsAppMessage(adminPhone, message);
      } else if (availableBalance < 100000) {
        const message = `⚠️ ALERTA DE SALDO BAJO ⚠️\n\nEl saldo disponible en la cuenta bancaria es menor a 100,000 VES.\n\nSaldo actual: ${availableBalance.toLocaleString('es-VE')} VES\n\nSe recomienda recargar la cuenta pronto.`;
        await this.sendWhatsAppMessage(adminPhone, message);
      }
    } catch (error) {
      console.error('Error al enviar notificación de saldo bajo:', error);
    }
  }

  private transactionDetailInclude() {
    return {
      creador: {
        include: {
          Transaction: {
            include: {
              origen: true,
              destino: true,
              instrument: {
                include: {
                  bank: true
                }
              }
            },
            orderBy: {
              publicId: 'desc'
            },
            take: 10
          },
          _count: {
            select: {
              Transaction: true,
              Recharge: true,
              wallets: true
            }
          }
        }
      },
      origen: true,
      destino: true,
      despachador: true,
      wallet: {
        include: {
          country: true
        }
      },
      cliente: {
        include: {
          recharges: {
            orderBy: {
              publicId: 'desc',
            },
            take: 10,
          },
          Transaction: {
            include: {
              origen: true,
              destino: true
            },
            orderBy: {
              publicId: 'desc',
            },
            take: 10,
          },
        },
      },
      instrument: {
        include: {
          accountType: true,
          bank: true,
          country: true,
        },
      },
    } as any;
  }

  async create(createTransactionDto: CreateTransactionDto) {
    // Buscar las relaciones necesarias
    const creador = await this.prisma.user.findFirstOrThrow({ where: { id: createTransactionDto.creadorId } });
    const wallet = await this.prisma.wallet.findFirstOrThrow({ where: { id: createTransactionDto.walletId }, include: { country: true, user: true } });
    const origen = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.origenId } });
    const destino = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.destinoId } });
    const rate = await this.prisma.rate.findFirstOrThrow({ where: { id: createTransactionDto.rateId }, include: { origin: true, destination: true } });

    if (rate.origin.id != origen.id && rate.destination.id != destino.id) {
      throw new BadRequestException("La tasa no corresponde a los paises seleccionados, inicia nuevamente la operacion");
    }

    // Validar balance del wallet
    const walletBalance = parseFloat(wallet.balance.toString());
    const transactionAmount = parseFloat(createTransactionDto.amount.toString());

    if (walletBalance < transactionAmount) {
      throw new BadRequestException("No cuentas con saldo para realizar esta transacción");
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // Hace 10 minutos

    const lastTransaction = await this.prisma.transaction.findFirst({
      where: {
        creadorId: createTransactionDto.creadorId,
        walletId: createTransactionDto.walletId,
        montoOrigen: transactionAmount,
        origenId: createTransactionDto.origenId,
        destinoId: createTransactionDto.destinoId,
        instrumentId: createTransactionDto.instrumentId,
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (lastTransaction) {
      throw new BadRequestException("Operacion Duplicada: Debes esperar un minimo de 10 minutos para realizar otra operacion con los mismos datos!");
    }

    // Restar el saldo del wallet de quien crea
    await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: createTransactionDto.amount } } })

    // Cálculos principales
    const rateAmount = parseFloat(rate.amount.toString());
    const saldoCalculo = transactionAmount

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

    // Aplicar regla de redondeo específica para montoDestino
    const roundedValue = Math.round(montoDestino * 1000) / 1000; // Obtener 3 decimales primero
    const lastDigit = Math.round((roundedValue * 1000) % 10); // Obtener último dígito
    montoDestino = lastDigit >= 5
      ? Math.ceil(roundedValue * 100) / 100
      : Math.floor(roundedValue * 100) / 100;

    console.log('montoDestino: ' + montoDestino)

    const tipoCalculo = rate.type_profit;
    const porcentajeCalculo = origen[tipoCalculo];
    const porcentajeDelMonto = parseFloat(((transactionAmount * porcentajeCalculo) / 100).toFixed(3));

    const porcentajeIntermediario = parseFloat(creador.profitPercent.toString());
    let gananciaIntermediario = 0
    if (porcentajeIntermediario > 0) {
      gananciaIntermediario = parseFloat(((transactionAmount * porcentajeIntermediario) / 100).toFixed(3));
    }

    const gananciaPanet = parseFloat((porcentajeDelMonto - gananciaIntermediario).toFixed(3));


    // Crear la transacción
    const transaction = await this.prisma.transaction.create({
      data: {
        creador: {
          connect: { id: createTransactionDto.creadorId }
        },
        wallet: {
          connect: { id: createTransactionDto.walletId }
        },
        cliente: createTransactionDto.clienteId ? {
          connect: { id: createTransactionDto.clienteId }
        } : undefined,
        instrument: {
          connect: { id: createTransactionDto.instrumentId }
        },
        origen: {
          connect: { id: createTransactionDto.origenId }
        },
        destino: {
          connect: { id: createTransactionDto.destinoId }
        },
        montoOrigen: transactionAmount,
        montoDestino: montoDestino,
        montoTasa: rateAmount,
        monedaOrigen: origen.currency,
        monedaDestino: destino.currency,
        montoComisionPasarela: 0,
        gananciaIntermediario: gananciaIntermediario,
        gananciaPanet: gananciaPanet,
        gastosAdicionales: 0,
        nro_referencia: '0',
        comprobante: '0',
        observacion: 'ninguna',
        status: "CREADA",
      },
      include: {
        creador: true,
        wallet: true,
        cliente: true,
        instrument: {
          include: {
            bank: true
          }
        },
        origen: true,
        destino: true,
      },
    });

    let randomUser: any = null;

    if (transaction.instrument.typeInstrument !== 'PAGO_MOVIL' && transaction.destino.name === 'VENEZUELA') {
      const roles = ['DESPACHADOR']
      const duenos = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: {
                  in: roles,
                },
              },
            },
          },
          status_despachador: 'ACTIVO',
          wallets: {
            some: {
              countryId: destino.id,
              type: 'RECEPCION',
              status: 'ACTIVO'
            },
          },
        },
        include: {
          wallets: true,
          clientes: true,
          referrals: true,
          referrer: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      //buscar usuarios dueños de cuenta
      randomUser = duenos.length > 0 ? duenos[Math.floor(Math.random() * duenos.length)] : null;

      if (duenos.length === 0) {
        try {
          const message = `La transaccion N° ${transaction.publicId} no pudo ser asignada para despacho procede a asignarla manualmente! `
          await this.sendWhatsAppMessage('584148383419', message);
        } catch (error) {
          console.error('Error al enviar notificación de WhatsApp:', error);
        }
      } else {
        const colaEspera = await this.prisma.colaEspera.create({
          data: {
            type: 'TRANSACCION',
            userId: randomUser.id,
            transactionId: transaction.id,
            status: 'INICIADA'
          }
        })

        try {
          const message = `Tienes una operacion por despachar, por favor realizada en menos de 5 minutos. Departamento de Tecnologia! `
          await this.sendWhatsAppMessage(randomUser.phone, message);
        } catch (error) {
          console.error('Error al enviar notificación de WhatsApp:', error);
        }

        if (randomUser.expoPushToken) {
          try {
            this.notification.sendPushNotification(randomUser.expoPushToken, "Nueva Transaccion por Despachar", "Entra a tu aplicacion PANET ADMIN en el perfil DUEÑO DE CUENTA para aprobar la misma", {
              screen: "DespachoPage",
              params: { transactionId: transaction.id }
            });
          } catch (error) {
            console.error('Error al enviar notificación push:', error);
          }

          try {
            const message = `La transaccion N° ${transaction.publicId} esta pendiente de despacho! `
            await this.sendWhatsAppMessage(randomUser.phone, message);
          } catch (error) {
            console.error('Error al enviar notificación de WhatsApp:', error);
          }
        }
      }
    }

    try {
      await this.notification.sendPushNotification(
        wallet.user.expoPushToken,
        `Estimado cliente tu Operacion TRX-2025-${transaction.publicId}`,
        `Hemos creado tu operacion exitosamente en nuestro sistema, en los proximos minutos, tendras actualizaciones de estado de la misma, recuerda el tiempo para una operacion es de 1 a 30 minutos`
      )
    } catch (error) {
      console.error('Error al enviar notificación push:', error);
    }

    if (porcentajeIntermediario > 0) {
      const sumGI = await this.prisma.wallet.upsert({
        where: {
          userId_countryId_type: {
            userId: creador.id,
            countryId: origen.id,
            type: 'GANANCIAS'
          }
        },
        update: {
          balance: {
            increment: gananciaIntermediario
          }
        },
        create: {
          userId: creador.id,
          countryId: origen.id,
          type: 'GANANCIAS',
          balance: gananciaIntermediario,
        }
      })

      await this.prisma.walletTransactions.create({
        data: {
          amount: gananciaIntermediario,
          amount_old: 0,
          amount_new: sumGI.balance,
          description: 'Ingreso por ganancias de operacion',
          type: 'DEPOSITO',
          walletId: sumGI.id,
        }
      })
    }

    await this.prisma.walletTransactions.create({
      data: {
        amount: createTransactionDto.amount,
        amount_old: wallet.balance,
        amount_new: parseFloat(createTransactionDto.amount.toString()) - parseFloat(wallet.balance.toString()),
        description: `Egreso por transaccion ${transaction.id}`,
        type: 'RETIRO',
        walletId: wallet.id,
      }
    })

    if (transaction.instrument.typeInstrument === 'PAGO_MOVIL' && transaction.destino.name === 'VENEZUELA') {
      // Validar balance disponible antes de procesar el pago móvil
      try {
        const balanceInfo = await this.movementsAccountJuridicService.getAccountBalance();
        const availableBalance = parseFloat(balanceInfo.availableBalance.toString());

        // Enviar notificación si el saldo es bajo
        await this.notifyLowBalance(availableBalance);

        if (availableBalance <= 10000) {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'ERROR',
              errorResponse: {
                message: 'Saldo insuficiente en cuenta bancaria',
                availableBalance: balanceInfo.availableBalance,
                requiredMinimum: 10000
              }
            }
          });
          return transaction;
        }
      } catch (balanceError) {
        console.error('Error al consultar balance de cuenta bancaria:', balanceError);
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'ERROR',
            errorResponse: {
              message: 'Error al consultar saldo de cuenta bancaria',
              error: balanceError instanceof Error ? balanceError.message : 'Error desconocido'
            }
          }
        });
        return transaction;
      }

      // Generar número de referencia de 6 dígitos
      let numeroReferencia = transaction.publicId.toString();
      if (numeroReferencia.length < 6) {
        // Agregar número aleatorio adelante para completar 6 dígitos
        const randomPrefix = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
        numeroReferencia = randomPrefix.toString() + numeroReferencia;
      }
      numeroReferencia = numeroReferencia.substring(0, 6); // Asegurar máximo 6 dígitos

      const jsonBDV = {
        numeroReferencia: numeroReferencia,
        montoOperacion: transaction.montoDestino.toString(),
        nacionalidadDestino: "V",
        cedulaDestino: transaction.instrument.document.toString(),
        telefonoDestino: transaction.instrument.accountNumber.toString(),
        bancoDestino: transaction.instrument.bank.code.toString(),
        moneda: "VES",
        conceptoPago: `CONECTA CONSULTING ${transaction.publicId}`
      }

      // Realizar llamada a API de Banvenez
      try {
        const response = await axios.post(process.env.BANVENEZ_API_URL, jsonBDV, {
          headers: {
            'x-api-key': process.env.BANVENEZ_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        // Verificar respuesta exitosa
        if (response.data && response.data.code === 1000 && response.data.message === 'Transaccion realizada') {
          // Actualizar cola de espera a CERRADA
          if (randomUser) {
            await this.prisma.colaEspera.update({
              where: {
                transactionId_userId_type: {
                  transactionId: transaction.id,
                  type: 'TRANSACCION',
                  userId: randomUser.id
                }
              },
              data: {
                status: 'CERRADA'
              }
            });
          }

          // Actualizar transacción a COMPLETADA con referencia
          const updatedTransaction = await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'COMPLETADA',
              nro_referencia: response.data.referencia
            },
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

          console.log("AQUI ESTAMOS PROCESANDO Y ENTRANDO EN EL TRY");

          try {
            console.log('🔄 [TransactionService] Iniciando generación de comprobante (pago móvil):', {
              transactionId: updatedTransaction.publicId,
              status: updatedTransaction.status,
            });

            const logoResponse = await axios.get('https://panel.paneteirl.com/logo_conecta.png', { responseType: 'arraybuffer' });
            const logoDataUri = `data:image/png;base64,${Buffer.from(logoResponse.data).toString('base64')}`;

            console.log('📸 [TransactionService] Generando imagen del comprobante...');
            const imageDataUri = await generateTransactionImage(updatedTransaction, logoDataUri);
            const imageBuffer = Buffer.from(imageDataUri.split(',')[1], 'base64');

            const imageFileName = `comprobante-TRX-${updatedTransaction.publicId}.png`;
            const imagePath = `${process.cwd()}/uploads/${imageFileName}`;
            fs.writeFileSync(imagePath, imageBuffer);

            const imageUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${imageFileName}`;

            console.log('🧾 [TransactionService] Comprobante generado para transacción:', {
              transactionId: updatedTransaction.publicId,
              imageFileName: imageFileName,
              imagePath: imagePath,
              imageUrl: imageUrl,
              archivoExiste: fs.existsSync(imagePath),
              tamañoArchivo: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0,
            });

            const recipient = updatedTransaction.cliente || updatedTransaction.creador;
            console.log('🔍 [TransactionService] Verificando destinatario:', {
              transactionId: updatedTransaction.publicId,
              tieneCliente: !!updatedTransaction.cliente,
              tieneCreador: !!updatedTransaction.creador,
              tieneRecipient: !!recipient,
            });

            if (recipient) {
              console.log('👤 [TransactionService] Preparando envío de comprobante a:', {
                transactionId: updatedTransaction.publicId,
                recipientId: recipient.id,
                recipientName: recipient.name,
                recipientPhone: recipient.phone,
                tieneTelefono: !!recipient.phone,
              });

              if (!recipient.phone) {
                console.error('❌ [TransactionService] ERROR: El destinatario no tiene teléfono:', {
                  transactionId: updatedTransaction.publicId,
                  recipientId: recipient.id,
                  recipientName: recipient.name,
                });
              } else {
                const completionMessage = `🎉 ¡Transacción Completada Exitosamente! 🎉

Hola ${recipient.name || 'Estimado cliente'},

Te informamos que tu transacción ha sido procesada y completada correctamente.

📋 *Detalles de tu operación:*
• Número de transacción: TRX-${updatedTransaction.publicId}
• Estado: ✅ Completada

Adjunto encontrarás el comprobante de tu operación.

Gracias por confiar en *Panet Remesas* 💙

Si tienes alguna consulta, no dudes en contactarnos.
Equipo Panet Remesas`;

                console.log('📤 [TransactionService] Preparando envío de comprobante de pago móvil:', {
                  transactionId: updatedTransaction.publicId,
                  telefono: recipient.phone,
                  imageUrl: imageUrl,
                  imagenExiste: fs.existsSync(imagePath),
                  tamañoMensaje: completionMessage.length,
                });

                try {
                  const resultado = await this.sendWhatsAppMessage(recipient.phone, completionMessage, imageUrl);
                  console.log('📊 [TransactionService] Resultado del envío de comprobante (pago móvil):', {
                    transactionId: updatedTransaction.publicId,
                    telefono: recipient.phone,
                    exito: resultado,
                    timestamp: new Date().toISOString(),
                  });

                  if (!resultado) {
                    console.error('❌ [TransactionService] FALLO en el envío del comprobante (pago móvil):', {
                      transactionId: updatedTransaction.publicId,
                      telefono: recipient.phone,
                      imageUrl: imageUrl,
                      razon: 'El método sendWhatsAppMessage retornó false',
                    });
                  }
                } catch (sendError) {
                  console.error('❌ [TransactionService] EXCEPCIÓN al enviar comprobante (pago móvil):', {
                    transactionId: updatedTransaction.publicId,
                    telefono: recipient.phone,
                    error: sendError instanceof Error ? sendError.message : 'Error desconocido',
                    stack: sendError instanceof Error ? sendError.stack : undefined,
                  });
                  throw sendError; // Re-lanzar para que se capture en el catch externo
                }
              }

              // Enviar mensaje de la rifa hasta el 13/11/2025
              if (recipient && recipient.phone) {
                try {
                  const today = new Date();
                  const raffleEndDate = new Date('2025-11-13T23:59:59');
                  if (today <= raffleEndDate) {
                    const raffleMessage = `✨ ¡La Suerte te Sonríe con Gana con Panet! ✨\n\nQueremos que sientas la emoción de ganar.\n\nParticipa en nuestras rifas exclusivas o juega a tus animalitos favoritos 🐯🍀 de forma sencilla, segura y muy divertida. ¡Tienes la oportunidad de ganar grandes premios todos los días!\n\n📲 Para unirte a la emoción o comprar tus jugadas, contáctanos: +51 921 276 727.\n\n💬 Estamos listos para atenderte con gusto. ¡Mucha suerte!`;
                    const raffleImageUrl = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/RIFA%20PREMIO%20MAYOR%202.jpg';
                    await this.sendWhatsAppMessage(recipient.phone, raffleMessage, raffleImageUrl);
                    const raffleUrl2 = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/Lista%20de%20paises%20cuadro.jpg';
                    await this.sendWhatsAppMessage(recipient.phone, "", raffleUrl2);
                  }
                } catch (error) {
                  console.error('❌ [TransactionService] Error al enviar mensaje de la rifa (pago móvil):', {
                    transactionId: updatedTransaction.publicId,
                    error: error instanceof Error ? error.message : 'Error desconocido',
                  });
                }
              }
            } else {
              console.warn('⚠️ [TransactionService] No se encontró destinatario para enviar comprobante:', {
                transactionId: updatedTransaction.publicId,
                tieneCliente: !!updatedTransaction.cliente,
                tieneCreador: !!updatedTransaction.creador,
              });
            }

          } catch (error) {
            console.error('❌ [TransactionService] ERROR generando o enviando comprobante (pago móvil):', {
              transactionId: updatedTransaction?.publicId,
              error: error instanceof Error ? error.message : 'Error desconocido',
              stack: error instanceof Error ? error.stack : undefined,
            });
          }


          // Crear registros de movimientos para EGRESO
          const transactionAmount = parseFloat(transaction.montoDestino.toString());

          // Crear registro principal de EGRESO
          await this.movementsAccountJuridicService.create({
            amount: transactionAmount.toString(),
            type: 'EGRESO',
            description: `Egreso por transacción TRX-2025-${transaction.publicId}`
          });

          // Crear registro adicional del 0.3% como EGRESO
          const feeAmount = transactionAmount * 0.003;
          await this.movementsAccountJuridicService.create({
            amount: feeAmount.toString(),
            type: 'EGRESO',
            description: `Comisión 0.3% por transacción TRX-2025-${transaction.publicId}`
          });
        }
        else {
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'ERROR',
              errorResponse: response.data
            }
          });
        }
      } catch (error) {
        console.error('Error al llamar API de Banvenez:', error);
        const errorPayload = axios.isAxiosError(error)
          ? (error.response?.data ?? { message: error.message })
          : { message: (error as Error).message };

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'ERROR',
            errorResponse: errorPayload
          }
        });
      }

    }

    return {
      success: true,
      message: "Transacción creada exitosamente.",
      data: transaction,
    };
  }

  async findAll(query, user) {
    const { creadorId, origenId, destinoId, clienteId, instrumentId, status } = query;
    const filters: any = {};

    // Verificar si el usuario tiene el rol de SUPERADMIN u OPERADOR
    const hasSuperAdminRole = user.roles.some(
      (role) => role.role && (role.role.name === 'SUPERADMIN' || role.role.name === 'OPERADOR')
    );

    // Si no es SUPERADMIN u OPERADOR, limitar las transacciones al creadorId del usuario
    if (!hasSuperAdminRole) {
      filters.creadorId = user.id;
    }

    if (creadorId && hasSuperAdminRole) {
      filters.creadorId = creadorId;
    }
    if (origenId) {
      filters.origenId = origenId;
    }
    if (destinoId) {
      filters.destinoId = destinoId;
    }
    if (clienteId) {
      filters.clienteId = clienteId;
    }
    if (instrumentId) {
      filters.instrumentId = instrumentId;
    }
    if (status) {
      filters.status = status;
    }

    // Obtener las transacciones de la base de datos con los filtros aplicados
    const data = await this.prisma.transaction.findMany({
      where: filters,
      include: {
        creador: true,
        origen: true,
        destino: true,
        cliente: true,
        instrument: true,
      },
      orderBy: {
        publicId: 'desc'
      }
    });

    return { data, message: 'Transacciones Obtenidas con éxito' };
  }

  async findOne(identifier) {
    const where = identifier
      ? {
        OR: [
          { id: identifier },
          { nro_referencia: identifier },
        ],
      }
      : undefined;

    const data = await this.prisma.transaction.findFirst({
      where,
      include: this.transactionDetailInclude(),
    });

    return { data, message: 'Listado de Transacciones' };
  }

  async findByReferenceToday(reference: string) {
    if (!reference) {
      throw new BadRequestException('El número de referencia es requerido.');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const data = await this.prisma.transaction.findFirst({
      where: {
        nro_referencia: reference,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: this.transactionDetailInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data, message: 'Transacción encontrada para el día actual' };
  }

  async procesar(dataAprobar, file, user) {
    const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;

    // Buscamos la transacción actual
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dataAprobar.transactionId },
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

    // Calculamos el monto extra si se indicó gasto adicional.
    // Se asume que dataAprobar.gastoAdicional es un string "true" o "false"
    const isAdditional = dataAprobar.gastoAdicional === 'true' || dataAprobar.gastoAdicional === true;
    const extraCharge = isAdditional ? parseFloat(transaction.montoDestino.toString()) * 0.003 : 0;

    // Actualizamos la transacción agregando el valor en el campo gastosAdicionales
    const data = await this.prisma.transaction.update({
      where: { id: dataAprobar.transactionId },
      data: {
        comprobante: fileUrl,
        nro_referencia: dataAprobar.referenceNumber,
        status: 'COMPLETADA',
        despachadorId: user.id,
        // Se guarda el valor calculado, ya sea 0 o el 0.3% del montoDestino
        gastosAdicionales: extraCharge,
      },
      include: {
        destino: true,
        creador: true,
        cliente: true,
        despachador: true,
        instrument: {
          include: {
            bank: true
          }
        }
      }
    });

    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId: user.id,
        countryId: data.destino.id,
        type: 'RECEPCION'
      }
    });

    if (!wallet) {
      throw new BadRequestException("El usuario despachador no tiene wallet activo, contactar con soporte!");
    }

    if (parseFloat(wallet.balance.toString()) >= parseFloat(data.montoDestino.toString())) {
      // Resta el saldo del wallet
      await this.prisma.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          balance: {
            decrement: data.montoDestino
          }
        }
      });

      await this.prisma.walletTransactions.create({
        data: {
          amount: data.montoDestino,
          amount_new: parseFloat(wallet.balance.toString()) - parseFloat(data.montoDestino.toString()),
          amount_old: wallet.balance,
          wallet: {
            connect: {
              id: wallet.id,
            },
          },
          description: "Retiro por Operacion TRX-2025-" + data.publicId,
          type: "RETIRO"
        },
      });

      // Enviar notificación solo a cliente o creador (priorizando cliente)
      const recipient = data.cliente || data.creador;
      if (recipient) {
        try {
          let message = "Estimado Cliente te adjuntamos el comprobante de tu transaccion la cual se ha procesada con exito!";
          const url = `https://api-whatsapp.paneteirl.store/send-message?number=${recipient.phone}&message=${encodeURIComponent(message)}&imageUrl=${fileUrl}`;
          await this.whatsappService.sendMessageSafely(url);
        } catch (error) {
          console.error('Error al enviar notificación de WhatsApp:', error);
        }
      }

      try {
        this.notification.sendPushNotification(
          data.creador.expoPushToken,
          `Transaccion TRX-2025-${data.publicId} Completada`,
          'Su transaccion se ha completado correctamente',
          {
            screen: "ReciboEnvio",
            params: { transaction: data.id }
          }
        );
      } catch (error) {
        console.error('Error al enviar notificación push:', error);
      }
    } else {
      const dataRollback = await this.prisma.transaction.update({
        where: { id: dataAprobar.transactionId },
        data: {
          comprobante: "0",
          nro_referencia: "0",
          status: 'CREADA'
        },
      });
      throw new BadRequestException("No cuentas con el saldo disponible para ejecutar esta transaccion");
    }

    // Generate and send PDF receipt
    try {
      const pdfDataUri = await generateTransactionPdf(data);
      const pdfBuffer = Buffer.from(pdfDataUri.split(',')[1], 'base64');

      // Save PDF to uploads folder
      const pdfFileName = `comprobante-TRX-${data.publicId}.pdf`;
      const pdfPath = `${process.cwd()}/uploads/${pdfFileName}`;
      require('fs').writeFileSync(pdfPath, pdfBuffer);

      const pdfUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${pdfFileName}`;

      console.log('📄 [TransactionService] PDF generado (procesar):', {
        transactionId: data.publicId,
        pdfFileName: pdfFileName,
        pdfPath: pdfPath,
        pdfUrl: pdfUrl,
        fileUrl: fileUrl,
        archivoPdfExiste: fs.existsSync(pdfPath),
      });

      // Enviar notificación con ambos documentos
      const recipient = data.cliente || data.creador;
      if (recipient) {
        console.log('👤 [TransactionService] Preparando envío de comprobante (procesar):', {
          transactionId: data.publicId,
          recipientId: recipient.id,
          recipientName: recipient.name,
          recipientPhone: recipient.phone,
          tieneTelefono: !!recipient.phone,
        });

        try {
          // First send the image (original behavior)
          console.log('📤 [TransactionService] Enviando imagen del comprobante...');
          const completionMessage = `🎉 ¡Transacción Completada Exitosamente! 🎉

              Hola ${recipient.name || 'Estimado cliente'},

              Te informamos que tu transacción ha sido procesada y completada correctamente.

              📋 *Detalles de tu operación:*
              • Número de transacción: TRX-${data.publicId}
              • Estado: ✅ Completada

              Adjunto encontrarás el comprobante de tu operación.

              Gracias por confiar en *Panet Remesas* 💙

              Si tienes alguna consulta, no dudes en contactarnos.
              Equipo Panet Remesas`;
          await this.sendWhatsAppMessage(recipient.phone, completionMessage, fileUrl);

          // Then send the PDF (mantener método antiguo para documentos por ahora)
          console.log('📤 [TransactionService] Enviando PDF del comprobante...');
          await this.whatsappService.sendDocumentMessage(recipient.phone, 'Adjunto encontrará el comprobante en formato PDF', pdfUrl, `Comprobante-TRX-${data.publicId}.pdf`);
        } catch (error) {
          console.error('❌ [TransactionService] Error al enviar notificación de WhatsApp (procesar):', error);
        }
      } else {
        console.warn('⚠️ [TransactionService] No se encontró destinatario para enviar comprobante (procesar):', {
          transactionId: data.publicId,
          tieneCliente: !!data.cliente,
          tieneCreador: !!data.creador,
        });
      }
    } catch (error) {
      console.error('❌ [TransactionService] Error generating PDF:', error);
      // Fallback to original image-only behavior if PDF fails
      const recipient = data.cliente || data.creador;
      if (recipient) {
        console.log('🔄 [TransactionService] Fallback: enviando solo imagen sin PDF...');
        try {
          const fallbackMessage = `🎉 ¡Transacción Completada Exitosamente! 🎉

Hola ${recipient.name || 'Estimado cliente'},

Te informamos que tu transacción ha sido procesada y completada correctamente.

📋 *Detalles de tu operación:*
• Número de transacción: TRX-${data.publicId}
• Estado: ✅ Completada

Adjunto encontrarás el comprobante de tu operación.

Gracias por confiar en *Panet Remesas* 💙

Si tienes alguna consulta, no dudes en contactarnos.
Equipo Panet Remesas`;
          await this.sendWhatsAppMessage(recipient.phone, fallbackMessage, fileUrl);
        } catch (error) {
          console.error('❌ [TransactionService] Error al enviar notificación de WhatsApp (fallback):', error);
        }
      }
    }

    await this.prisma.colaEspera.update({
      where: {
        transactionId_userId_type: {
          transactionId: data.id,
          type: 'TRANSACCION',
          userId: user.id
        }
      },
      data: {
        status: 'CERRADA'
      }
    });
    return { data, message: 'Transaccion Ejecutada con éxito' }
  }

  async update(id: string, updateTransactionDto) {
    const data = await this.prisma.transaction.update({
      where: { id },
      data: { status: 'ANULADA' }
    })

    return { data, message: 'Transaccion Anulada con exito' }
  }

  remove(id: string) {
    return `This action removes a #${id} transaction`;
  }

  async notificar(data, file) {
    try {
      const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;

      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: data.transactionId
        },
        include: {
          creador: {
            select: {
              phone: true
            }
          },
          cliente: {
            select: {
              phone: true
            }
          }
        }
      });

      // Si no se encuentra la transacción, retornamos éxito para no bloquear el flujo
      if (!transaction) {
        console.warn(`No se encontró la transacción con ID: ${data.transactionId}`);
        return { success: true, message: 'Operación completada, pero no se pudo enviar la notificación' };
      }

      let phone = null;
      if (transaction.cliente?.phone) {
        phone = transaction.cliente.phone;
      }
      else if (transaction.creador?.phone) {
        phone = transaction.creador.phone;
      }

      // Si no hay teléfono, retornamos éxito para no bloquear el flujo
      if (!phone) {
        console.warn(`No se encontró un número de teléfono para la transacción con ID: ${data.transactionId}`);
        return { success: true, message: 'Operación completada, pero no se pudo enviar la notificación' };
      }

      let message = "Estimado Cliente te adjuntamos el comprobante de tu transaccion la cual se encuentra en proceso!";

      // Usamos el método específico para enviar mensajes con imágenes
      const result = await this.sendWhatsAppMessage(phone, message, fileUrl);

      return {
        success: true,
        message: result
          ? 'Notificación enviada con éxito'
          : 'Operación completada, pero hubo un problema al enviar la notificación'
      };
    } catch (error) {
      // Registramos el error pero no lo propagamos
      console.error('Error al enviar notificación de WhatsApp:', error);
      return {
        success: true,
        message: 'Operación completada, pero no se pudo enviar la notificación'
      };
    }
  }

  async transferir(data) {
    const dataa = await this.prisma.colaEspera.update({
      where: {
        id: data.id
      },
      data: {
        userId: data.userId
      }
    })

    return { data: dataa, message: 'Transferencia echa con exito' }
  }

  async paymentsMethods(countryCode?: string) {
    const methods = [
      {
        countryCode: 'PE',
        methods: [
          {
            id: 29,
            pasarela: 'Flow',
            name: 'Pago Efectivo',
            image: 'https://www.blaventech.com/wp-content/uploads/2021/11/pago-efectivo.png',
            description: 'Realiza tus pagos en efectivo en agentes y establecimientos autorizados.',
            min: 100,
            fee: 5.5,
            time: 'Inmediato'
          },
          {
            id: 152,
            pasarela: 'Flow',
            name: 'Yape',
            image: 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-original-577x577/s3/032021/yape.png?sbmszL8CD.TqS8SZ5YaqDfOHxLgBAJid&itok=FFFRSqls',
            description: 'Realiza un yape rapido y directo!',
            min: 60,
            fee: 4.5,
            time: 'Inmediato'
          },
          {
            id: 153,
            pasarela: 'Floid',
            name: 'Transferencia Bancaria',
            image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.',
            fee: 2.5,
            time: 'Inmediato'
          }
        ],
        alertas: [
          {
            type: 'error',
            title: 'Información Importante',
            description: 'Solo tenemos operaciones superiores a 60 Soles.'
          }
        ]
      },
      {
        countryCode: 'CL',
        methods: [
          {
            id: 0,
            pasarela: 'Floid',
            name: 'Transferencia Bancaria',
            image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.',
            fee: 2.5,
            time: 'Inmediato'
          },
          {
            id: 15,
            pasarela: 'Flow',
            name: 'Match',
            image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.',
            fee: 3,
            time: 'Inmediato'
          }
        ]
      }
    ];

    const manualMethod = {
      id: 'Manual',
      pasarela: 'Manual',
      name: 'Manual',
      image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
      description: 'Realiza una transferencia directamente desde tu banco, a nuestra cuenta.',
      fee: 0,
      time: '10min - 45min'
    };

    let result = [];

    if (!countryCode) {
      // Todos los países, agregando Manual a cada uno
      result = methods.map(m => ({
        ...m,
        methods: [...m.methods, manualMethod]
      }));
    } else {
      const found = methods.find(m => m.countryCode === countryCode);
      if (found) {
        result = [{
          ...found,
          methods: [...found.methods, manualMethod]
        }];
      } else {
        result = [{
          countryCode,
          methods: [manualMethod]
        }];
      }
    }

    return { data: result, message: 'Metodos obtenidos con exito' };
  }

  async getConciliationData(fechaIni: string, fechaFin: string) {
    console.log('=== INICIANDO CONSULTA DE CONCILIACIÓN ===');
    console.log('Fecha inicio:', fechaIni);
    console.log('Fecha fin:', fechaFin);

    try {
      const payload = {
        cuenta: process.env.BANVENEZ_ACCOUNT_NUMBER,
        fechaIni: fechaIni,
        fechaFin: fechaFin,
        tipoMoneda: "VES",
        nroMovimiento: ""
      };

      console.log('Payload a enviar:', payload);
      console.log('URL de conciliación:', process.env.BANVENEZ_CONCILIATION_URL);
      console.log('API Key:', process.env.BANVENEZ_API_KEY ? 'Configurada' : 'No configurada');

      const response = await axios.post(process.env.BANVENEZ_CONCILIATION_URL, payload, {
        headers: {
          'x-api-key': process.env.BANVENEZ_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log('=== RESPUESTA DE LA API DE CONCILIACIÓN ===');
      console.log('Status:', response.status);
      console.log('Data recibida:', response.data);

      return {
        success: true,
        message: "Datos de conciliación obtenidos exitosamente.",
        data: response.data,
        requestPayload: payload,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('=== ERROR EN CONSULTA DE CONCILIACIÓN ===');
      console.error('Error completo:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);

      return {
        success: false,
        message: "Error al obtener datos de conciliación.",
        error: error.message,
        details: error.response?.data || 'No response data',
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendDirectPagoMovil(dto: SendDirectPagoMovilDto) {
    const numeroReferencia = (Math.floor(Math.random() * 900000) + 100000).toString();

    const jsonBDV = {
      numeroReferencia,
      montoOperacion: dto.amount.toString(),
      nacionalidadDestino: "V",
      cedulaDestino: dto.document.toString(),
      telefonoDestino: dto.phoneNumber.toString(),
      bancoDestino: dto.bankCode.toString(),
      moneda: "VES",
      conceptoPago: dto.description || `PAGO MOVIL DIRECTO`
    };

    try {
      const response = await axios.post(process.env.BANVENEZ_API_URL, jsonBDV, {
        headers: {
          'x-api-key': process.env.BANVENEZ_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      // ✅ Caso de éxito
      if (response.data?.code === 1000 && response.data?.message === 'Transaccion realizada') {

        if (dto.transactionId) {
          const transaction = await this.prisma.transaction.findUnique({
            where: { id: dto.transactionId }
          });

          if (transaction) {
            const cola = await this.prisma.colaEspera.findFirst({
              where: { transactionId: dto.transactionId, status: { not: 'CERRADA' } }
            });

            if (cola) {
              await this.prisma.colaEspera.update({
                where: { id: cola.id },
                data: { status: 'CERRADA' }
              });
            }

            await this.prisma.transaction.update({
              where: { id: dto.transactionId },
              data: {
                status: 'COMPLETADA',
                nro_referencia: response.data.referencia
              }
            });
          } else {
            console.warn(`⚠️ Transacción con ID ${dto.transactionId} no encontrada. Se omite actualización.`);
          }
        }

        // 🔹 Generar imagen y enviar comprobante
        try {
          if (dto.transactionId) {
            const transaction = await this.prisma.transaction.findFirst({
              where: { id: dto.transactionId },
              include: {
                creador: true,
                cliente: true,
                destino: true,
                instrument: { include: { bank: true } }
              }
            });

            if (transaction) {
              const logoResponse = await axios.get('https://panel.paneteirl.com/logo_conecta.png', { responseType: 'arraybuffer' });
              const logoDataUri = `data:image/png;base64,${Buffer.from(logoResponse.data).toString('base64')}`;

              const imageDataUri = await generateTransactionImage(transaction, logoDataUri);
              const imageBuffer = Buffer.from(imageDataUri.split(',')[1], 'base64');

              const imageFileName = `comprobante-TRX-${transaction.publicId}.png`;
              const imagePath = `${process.cwd()}/uploads/${imageFileName}`;
              fs.writeFileSync(imagePath, imageBuffer);

              const imageUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${imageFileName}`;

              console.log('🧾 [TransactionService] Comprobante generado (sendDirectPagoMovil):', {
                transactionId: transaction.publicId,
                imageFileName: imageFileName,
                imagePath: imagePath,
                imageUrl: imageUrl,
                archivoExiste: fs.existsSync(imagePath),
              });

              const recipient = transaction.cliente || transaction.creador;
              if (recipient) {
                console.log('👤 [TransactionService] Preparando envío de comprobante (sendDirectPagoMovil):', {
                  transactionId: transaction.publicId,
                  recipientId: recipient.id,
                  recipientName: recipient.name,
                  recipientPhone: recipient.phone,
                  tieneTelefono: !!recipient.phone,
                });

                // Enviar comprobante
                if (!recipient.phone) {
                  console.error('❌ [TransactionService] ERROR: El destinatario no tiene teléfono (sendDirectPagoMovil):', {
                    transactionId: transaction.publicId,
                    recipientId: recipient.id,
                    recipientName: recipient.name,
                  });
                } else {
                  const completionMessage = `🎉 ¡Transacción Completada Exitosamente! 🎉

Hola ${recipient.name || 'Estimado cliente'},

Te informamos que tu transacción ha sido procesada y completada correctamente.

📋 *Detalles de tu operación:*
• Número de transacción: TRX-${transaction.publicId}
• Estado: ✅ Completada

Adjunto encontrarás el comprobante de tu operación.

Gracias por confiar en *Panet Remesas* 💙

Si tienes alguna consulta, no dudes en contactarnos.
Equipo Panet Remesas`;

                  console.log('📤 [TransactionService] Preparando envío de comprobante (sendDirectPagoMovil):', {
                    transactionId: transaction.publicId,
                    telefono: recipient.phone,
                    imageUrl: imageUrl,
                    imagenExiste: fs.existsSync(imagePath),
                    tamañoMensaje: completionMessage.length,
                  });

                  try {
                    const resultado = await this.sendWhatsAppMessage(recipient.phone, completionMessage, imageUrl);
                    console.log('📊 [TransactionService] Resultado del envío de comprobante (sendDirectPagoMovil):', {
                      transactionId: transaction.publicId,
                      telefono: recipient.phone,
                      exito: resultado,
                      timestamp: new Date().toISOString(),
                    });

                    if (!resultado) {
                      console.error('❌ [TransactionService] FALLO en el envío del comprobante (sendDirectPagoMovil):', {
                        transactionId: transaction.publicId,
                        telefono: recipient.phone,
                        imageUrl: imageUrl,
                        razon: 'El método sendWhatsAppMessage retornó false',
                      });
                    }

                    // Enviar mensaje de la rifa hasta el 13/11/2025
                    try {
                      const today = new Date();
                      const raffleEndDate = new Date('2025-11-13T23:59:59');
                      if (today <= raffleEndDate) {
                        const raffleMessage = `✨ ¡La Suerte te Sonríe con Gana con Panet! ✨\n\nQueremos que sientas la emoción de ganar.\n\nParticipa en nuestras rifas exclusivas o juega a tus animalitos favoritos 🐯🍀 de forma sencilla, segura y muy divertida. ¡Tienes la oportunidad de ganar grandes premios todos los días!\n\n📲 Para unirte a la emoción o comprar tus jugadas, contáctanos: +51 921 276 727.\n\n💬 Estamos listos para atenderte con gusto. ¡Mucha suerte!`;
                        const raffleImageUrl = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/RIFA%20PREMIO%20MAYOR%202.jpg';
                        await this.sendWhatsAppMessage(recipient.phone, raffleMessage, raffleImageUrl);
                        const raffleUrl2 = 'https://ujrwnbyfkcwuqihbaydw.supabase.co/storage/v1/object/public/images/Lista%20de%20paises%20cuadro.jpg';
                        await this.sendWhatsAppMessage(recipient.phone, "", raffleUrl2);
                      }
                    } catch (error) {
                      console.error('❌ [TransactionService] Error al enviar mensaje de la rifa (sendDirectPagoMovil):', {
                        transactionId: transaction.publicId,
                        error: error instanceof Error ? error.message : 'Error desconocido',
                      });
                    }
                  } catch (sendError) {
                    console.error('❌ [TransactionService] EXCEPCIÓN al enviar comprobante (sendDirectPagoMovil):', {
                      transactionId: transaction.publicId,
                      telefono: recipient.phone,
                      error: sendError instanceof Error ? sendError.message : 'Error desconocido',
                      stack: sendError instanceof Error ? sendError.stack : undefined,
                    });
                    throw sendError; // Re-lanzar para que se capture en el catch externo
                  }
                }
              } else {
                console.warn('⚠️ [TransactionService] No se encontró destinatario para enviar comprobante:', {
                  transactionId: transaction.publicId,
                  tieneCliente: !!transaction.cliente,
                  tieneCreador: !!transaction.creador,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error generando imagen del comprobante:', error);
        }

        // 🔹 Registrar movimientos
        const transactionAmount = parseFloat(dto.amount.toString());
        await this.movementsAccountJuridicService.create({
          amount: transactionAmount.toString(),
          type: 'EGRESO',
          description: `Egreso por Pago Móvil Directo. Ref: ${response.data.referencia}`
        });

        const feeAmount = transactionAmount * 0.003;
        await this.movementsAccountJuridicService.create({
          amount: feeAmount.toString(),
          type: 'EGRESO',
          description: `Comisión 0.3% por Pago Móvil Directo. Ref: ${response.data.referencia}`
        });

        return {
          success: true,
          message: "Pago Móvil enviado exitosamente.",
          data: { reference: response.data.referencia, ...jsonBDV }
        };
      }

      // ❌ Error en respuesta del API Banvenez
      console.error('Error en la respuesta de la API de Banvenez:', response.data);

      if (dto.transactionId) {
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: dto.transactionId }
        });

        if (transaction) {
          const cola = await this.prisma.colaEspera.findFirst({
            where: { transactionId: dto.transactionId, status: { not: 'CERRADA' } }
          });

          if (cola) {
            await this.prisma.colaEspera.update({
              where: { id: cola.id },
              data: { status: 'CERRADA' }
            });
          }

          await this.prisma.transaction.update({
            where: { id: dto.transactionId },
            data: {
              status: 'ERROR',
              errorResponse: response.data
            }
          });
        } else {
          console.warn(`⚠️ Transacción con ID ${dto.transactionId} no encontrada. Se omite actualización.`);
        }
      }

      throw new BadRequestException(`Error al procesar el Pago Móvil: ${response.data.message || 'Respuesta no válida'}`);

    } catch (error) {
      const errorPayload = axios.isAxiosError(error)
        ? (error.response?.data ?? { message: error.message })
        : { message: (error as Error).message };

      console.error('Error al llamar API de Banvenez:', errorPayload);

      if (dto.transactionId) {
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: dto.transactionId }
        });

        if (transaction) {
          const cola = await this.prisma.colaEspera.findFirst({
            where: { transactionId: dto.transactionId, status: { not: 'CERRADA' } }
          });

          if (cola) {
            await this.prisma.colaEspera.update({
              where: { id: cola.id },
              data: { status: 'CERRADA' }
            });
          }

          await this.prisma.transaction.update({
            where: { id: dto.transactionId },
            data: {
              status: 'ERROR',
              errorResponse: errorPayload
            }
          });
        } else {
          console.warn(`⚠️ Transacción con ID ${dto.transactionId} no encontrada. Se omite actualización.`);
        }
      }

      throw new BadRequestException('Error de conexión con el servicio de pago. Intente más tarde.');
    }
  }


}