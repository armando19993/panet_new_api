import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.servise';
import { NotificationService } from 'src/notification/notification.service';
import axios from 'axios';

@Injectable()
export class TransactionService {

  constructor(
    private prisma: PrismaService,
    private notification: NotificationService
  ) { }

  async create(createTransactionDto: CreateTransactionDto) {
    // Buscar las relaciones necesarias
    const creador = await this.prisma.user.findFirstOrThrow({ where: { id: createTransactionDto.creadorId } });
    const wallet = await this.prisma.wallet.findFirstOrThrow({ where: { id: createTransactionDto.walletId }, include: { country: true, user: true } });
    const origen = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.origenId } });
    const destino = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.destinoId } });
    const rate = await this.prisma.rate.findFirstOrThrow({ where: { id: createTransactionDto.rateId }, include: { origin: true, destination: true } });

    // Validar balance del wallet
    const walletBalance = parseFloat(wallet.balance.toString());
    const transactionAmount = parseFloat(createTransactionDto.amount.toString());

    if (walletBalance < transactionAmount) {
      throw new BadRequestException("No cuentas con saldo para realizar esta transacción");
    }

    // Restar el saldo del wallet de quien crea
    await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: createTransactionDto.amount } } })

    // Cálculos principales
    const rateAmount = parseFloat(rate.amount.toString());
    const porcentajePasarela = parseFloat(((transactionAmount * 2) / 100).toFixed(3));
    const saldoCalculo = transactionAmount - porcentajePasarela

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

    const tipoCalculo = rate.type_profit;
    const porcentajeCalculo = origen[tipoCalculo];
    const porcentajeDelMonto = parseFloat(((transactionAmount * porcentajeCalculo) / 100).toFixed(3));

    const porcentajeIntermediario = parseFloat(creador.profitPercent.toString());
    const gananciaIntermediario = parseFloat(((transactionAmount * porcentajeIntermediario) / 100).toFixed(3));

    const gananciaPanet = parseFloat((porcentajeDelMonto - gananciaIntermediario).toFixed(3));

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
        wallets: {
          some: {
            countryId: destino.id,
            type: 'RECEPCION',
            balance: {
              gt: 0,
            },
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
        montoComisionPasarela: porcentajePasarela,
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
        instrument: true,
        origen: true,
        destino: true,
      },
    });

    //buscar usuarios dueños de cuenta
    const randomUser = duenos.length > 0 ? duenos[Math.floor(Math.random() * duenos.length)] : null;

    if (duenos.length === 0) {
      const message = `La transaccion N° ${transaction.publicId} no pudo ser asignada para despacho procede a asignarla manualmente! `
      const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=573207510120&message=${encodeURIComponent(message)}`;

      await axios.get(whatsappUrl);
    } else {
      await this.prisma.colaEspera.create({
        data: {
          type: 'TRANSACCION',
          userId: randomUser.id,
          transactionId: transaction.id,
          status: 'INICIADA'
        }
      })

      const message = `Tienes una operacion por despachar, por favor realizada en menos de 5 minutos. Departamento de Tecnologia! `
      const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${randomUser.phone}&message=${encodeURIComponent(message)}`;
      await axios.get(whatsappUrl);

      if (randomUser.expoPushToken) {
        this.notification.sendPushNotification(randomUser.expoPushToken, "Nueva Transaccion por Despachar", "Entra a tu aplicacion PANET ADMIN en el perfil DUEÑO DE CUENTA para aprobar la misma", {
          screen: "DespachoPage",
          params: { transactionId: transaction.id }
        })

        const message = `La transaccion N° ${transaction.publicId} esta pendiente de despacho! `
        const whatsappUrl = `https://api-whatsapp.paneteirl.store/send-message/text?number=${randomUser.phone}&message=${encodeURIComponent(message)}`;

        await axios.get(whatsappUrl);
      }
    }

    await this.notification.sendPushNotification(
      wallet.user.expoPushToken,
      `Estimado cliente tu Operacion TRX-2025-${transaction.publicId}`,
      `Hemos creado tu operacion exitosamente en nuestro sistema, en los proximos minutos, tendras actualizaciones de estado de la misma, recuerda el tiempo para una operacion es de 1 a 30 minutos`
    )

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

    return {
      success: true,
      message: "Transacción creada exitosamente.",
      data: transaction,
    };
  }

  async findAll(query, user) {
    console.log(user);

    const { creadorId, origenId, destinoId, clienteId, instrumentId, status } = query;
    const filters: any = {};

    // Verificar si el usuario tiene el rol de SUPERADMIN
    const hasSuperAdminRole = user.roles.some(
      (role) => role.role && role.role.name === 'SUPERADMIN'
    );

    // Si no es SUPERADMIN, limitar las transacciones al creadorId del usuario
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

  async findOne(id) {
    const data = await this.prisma.transaction.findFirst({
      where: {
        id,
      },
      include: {
        creador: {
          include: {
            Transaction: {
              include: {
                origen: true,
                destino: true
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
      },
    });

    return { data, message: 'Listado de Transacciones' };
  }

  async procesar(dataAprobar, file, user) {
    const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;
    console.log(user.id);

    // Buscamos la transacción actual (podrías obtenerla previamente para calcular el extra)
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dataAprobar.transactionId },
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
          amount_new: parseFloat(wallet.balance.toString()) + parseFloat(data.montoDestino.toString()),
          amount_old: wallet.balance,
          wallet: {
            connect: {
              id: wallet.id,
            },
          },
          description: "Recarga de Saldo REC-2025-" + data.publicId,
          type: "RETIRO"
        },
      });

      if (data.cliente) {
        let message = "Estimado Cliente te adjuntamos el comprobante de tu transaccion la cual se ha procesada con exito!";
        const url = `https://api-whatsapp.paneteirl.store/send-message?number=${data.cliente.phone}&message=${encodeURIComponent(message)}&imageUrl=${fileUrl}`;
        await axios.get(url);
      }

      this.notification.sendPushNotification(
        data.creador.expoPushToken,
        `Transaccion TRX-2025-${data.publicId} Completada`,
        'Su transaccion se ha completado correctamente',
        {
          screen: "ReciboEnvio",
          params: { transaction: data.id }
        }
      );

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
    })

    let phone = null
    if (transaction.cliente.phone) {
      phone = transaction.cliente.phone
    }
    else {
      phone = transaction.creador.phone
    }

    let message = "Estimado Cliente te adjuntamos el comprobante de tu transaccion la cual se encuentra en proceso!"
    const url = `https://api-whatsapp.paneteirl.store/send-message?number=${phone}&message=${encodeURIComponent(message)}&imageUrl=${fileUrl}`

    await axios.get(url);
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

  async paymentsMethods() {
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
            min: 100
          },
          {
            id: 152,
            pasarela: 'Flow',
            name: 'Yape',
            image: 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-original-577x577/s3/032021/yape.png?sbmszL8CD.TqS8SZ5YaqDfOHxLgBAJid&itok=FFFRSqls',
            description: 'Realiza un yape rapido y directo!',
            min: 60
          },
          {
            id: 153,
            pasarela: 'Floid',
            name: 'Transferencia Bancaria',
            image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.',
          }
        ],
        alertas: [
          {
            type: 'error',
            title: 'Información Importante',
            description: 'Solo se encuentran funcionales bancos Interbank y BCP, los otros estan presentando intermitencias'
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
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.'
          },
          {
            id: 15,
            pasarela: 'Flow',
            name: 'Match',
            image: 'https://static.floid.app/banks_logo/boton-bancos-pe.png',
            description: 'Realiza una transferencia directamente desde tu banco, al nuestro a través de Floid Payment.'
          }
        ]
      }
    ]

    return { data: methods, message: 'Metodos obtenidos con exito' }
  }

}
