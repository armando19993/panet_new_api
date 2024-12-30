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
    const wallet = await this.prisma.wallet.findFirstOrThrow({ where: { id: createTransactionDto.walletId }, include: {country: true} });
    const origen = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.origenId } });
    const destino = await this.prisma.country.findFirstOrThrow({ where: { id: createTransactionDto.destinoId } });
    const rate = await this.prisma.rate.findFirstOrThrow({ where: { id: createTransactionDto.rateId } });

    // Validar balance del wallet
    const walletBalance = parseFloat(wallet.balance.toString());
    const transactionAmount = parseFloat(createTransactionDto.amount.toString());

    if (walletBalance < transactionAmount) {
      throw new BadRequestException("No cuentas con saldo para realizar esta transacción");
    }

    await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: createTransactionDto.amount } } })

    // Cálculos principales
    const rateAmount = parseFloat(rate.amount.toString());
    const porcentajePasarela = parseFloat(((transactionAmount * 2) / 100).toFixed(3));
    const saldoCalculo = transactionAmount - porcentajePasarela
    const montoDestino = parseFloat((rateAmount * saldoCalculo).toFixed(3));

    const tipoCalculo = rate.type_profit;
    const porcentajeCalculo = origen[tipoCalculo];
    const porcentajeDelMonto = parseFloat(((transactionAmount * porcentajeCalculo) / 100).toFixed(3));

    const porcentajeIntermediario = parseFloat(creador.profitPercent.toString());
    const gananciaIntermediario = parseFloat(((transactionAmount * porcentajeIntermediario) / 100).toFixed(3));

    //sumar el saldo al dusdeño de cuenta
    await this.prisma.wallet.upsert({
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
            countryId: wallet.country.id,
            type: 'RECEPCION'
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

    const randomUser = duenos.length > 0 ? duenos[Math.floor(Math.random() * duenos.length)] : null;

    await this.prisma.colaEspera.create({
      data: {
        type: 'TRANSACCION',
        userId: randomUser.id,
        transactionId: transaction.id,
        status: 'INICIADA'
      }
    })

    this.notification.sendPushNotification(randomUser.expoPushToken, "Nueva Transaccion por Despachar", "Entra a tu aplicacion PANET ADMIN en el perfil DUEÑO DE CUENTA para aprobar la misma", {
      screen: "DespachoPage",
      params: { transactionId: transaction.id }
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
        id
      },
      include: {
        creador: true,
        origen: true,
        destino: true,
        cliente: true,
        instrument: {
          include: {
            accountType: true,
            bank: true,
            country: true
          }
        }
      }
    })

    return { data, message: 'Listado de Transacciones' }
  }

  async procesar(dataAprobar, file, user) {
    console.log(dataAprobar)
    console.log(file)
    const fileUrl = `${process.env.BASE_URL || 'https://api.paneteirl.com'}/uploads/${file.filename}`;

    const data = await this.prisma.transaction.update({
      where: { id: dataAprobar.transactionId },
      data: {
        comprobante: fileUrl,
        nro_referencia: dataAprobar.referenceNumber,
        status: 'COMPLETADA'
      },
      include: {
        destino: true,
        creador: true,
        cliente: true
      }
    })

    //disminuir el saldo en la cuenta del despachador
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId: user.id,
        countryId: data.destino.id,
        type: 'RECEPCION'
      }
    })

    if (!wallet) {
      throw new BadRequestException("El usuario despachador no tiene wallet activo, contactar con soporte!")
    }

    if (parseFloat(wallet.balance.toString()) >= parseFloat(data.montoDestino.toString())) {
      //restar el saldo del wallet
      await this.prisma.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          balance: {
            decrement: data.montoDestino
          }
        }
      })

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
      })

      if (data.cliente) {
        let message = "Estimado Cliente te adjuntamos el comprobante de tu transaccion la cual se ha procesada con exito!"
        const url = `https://api-whatsapp.paneteirl.store/send-message?number=${data.cliente.phone}&message=${encodeURIComponent(message)}&imageUrl=${fileUrl}`

        await axios.get(url);
      }

      this.notification.sendPushNotification(data.creador.expoPushToken, `Transaccion TRX-2025-${data.publicId} Completada`, 'Su transaccion se ha completado correctamente', {
        screen: "ReciboEnvio",
        params: { transaction: data.id }
      })

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
      })
    }
    else {
      const data = await this.prisma.transaction.update({
        where: { id: dataAprobar.transactionId },
        data: {
          comprobante: "0",
          nro_referencia: "0",
          status: 'CREADA'
        },
      })

      throw new BadRequestException("No cuentas con el saldo disponible para ejecutar esta transaccion")
    }

    return { data, message: 'Transaccion Eejcutada con exitos' }
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
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

}
