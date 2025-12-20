import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.servise';
import { MovementsAccountJuridicService } from 'src/movements-account-juridic/movements-account-juridic.service';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class ReportsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly movementsAccountJuridicService: MovementsAccountJuridicService,
        private readonly telegramService: TelegramService
    ) { }

    async home(user?: any) {
        try {
            // Obtener todos los países
            const countriesResponse = await this.prisma.country.findMany();
            const countries = countriesResponse;

            // Obtener el saldo de la cuenta juridica
            const accountBalance = await this.movementsAccountJuridicService.getAccountBalance();

            // Calcular el saldo en USDT usando la tasa de Venezuela
            const venezuela = countries.find(c => c.name === 'VENEZUELA');
            let accountBalanceUSDT = 0;
            let transactionRateWholesale = 0;

            if (venezuela) {
                const ratePurchase = parseFloat(venezuela.rate_purchase?.toString() || '1');
                const rateSales = parseFloat(venezuela.rate_sales?.toString() || '1');
                transactionRateWholesale = (ratePurchase + rateSales) / 2;

                if (transactionRateWholesale > 0) {
                    accountBalanceUSDT = accountBalance.availableBalance / transactionRateWholesale;
                }
            }

            // Calcular la fecha de hace 15 días
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Para cada país, obtener las wallets de recepción y sumar los montos
            const countryReports = await Promise.all(
                countries.map(async (country) => {
                    // Buscar todas las wallets de recepción para este país
                    const receptionWallets = await this.prisma.wallet.findMany({
                        where: {
                            countryId: country.id,
                            type: 'RECEPCION'
                        }
                    });

                    // Sumar el balance total de todas las wallets de recepción
                    const totalAmount = receptionWallets.reduce((sum, wallet) => {
                        return sum + parseFloat(wallet.balance.toString());
                    }, 0);

                    const wallets = await this.prisma.wallet.findMany({
                        where: {
                            countryId: country.id,
                            type: 'RECARGA'
                        }
                    });

                    // Obtener los IDs de las wallets de recepción para filtrar transacciones y recargas
                    const walletIds = wallets.map(wallet => wallet.id);

                    // Contar transacciones de los últimos 15 días filtradas por wallets de recepción del país
                    const totalTransactionsLast15Days = await this.prisma.transaction.count({
                        where: {
                            walletId: {
                                in: walletIds
                            },
                            createdAt: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    });

                    // Contar recargas de los últimos 15 días filtradas por wallets de recepción del país
                    const totalRechargesLast15Days = await this.prisma.recharge.count({
                        where: {
                            walletId: {
                                in: walletIds
                            },
                            createdAt: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    });

                    const ratePurchase = parseFloat(country.rate_purchase?.toString() || '1');
                    const rateSales = parseFloat(country.rate_sales?.toString() || '1');
                    const rateWholesale = (ratePurchase + rateSales) / 2;

                    const totalAmountUSDT = rateWholesale > 0 ? totalAmount / rateWholesale : 0;

                    return {
                        id: country.id,
                        name: country.name,
                        abbreviation: country.abbreviation,
                        currency: country.currency,
                        totalAmount: totalAmount,
                        totalAmountUSDT: totalAmountUSDT,
                        rateWholesale: rateWholesale,
                        totalTransactionsLast15Days: totalTransactionsLast15Days,
                        totalRechargesLast15Days: totalRechargesLast15Days
                    };
                })
            );

            // Calcular el total de USDT sumando todos los países
            const totalUSDTAllCountries = countryReports.reduce((sum, country) => {
                return sum + country.totalAmountUSDT;
            }, 0);

            // Enviar notificación a Telegram
            if (user) {
                const message = `
<b>🔔 Consulta de Reportes - Home</b>
<b>Usuario:</b> ${user.name} (${user.user})
<b>Total países:</b> ${countryReports.length}
<b>Fecha:</b> ${new Date().toLocaleString()}
                `;
                await this.telegramService.sendMessage(5720214404, message);
            }

            return {
                module: 'Reports',
                data: {
                    countries: countryReports,
                    summary: {
                        totalCountries: countryReports.length,
                        totalUSDTAllCountries: totalUSDTAllCountries,
                        accountBalance: {
                            ...accountBalance,
                            availableBalanceUSDT: accountBalanceUSDT,
                            rateUsed: transactionRateWholesale
                        }
                    }
                },
                message: 'Reporte de países con montos totales obtenido con éxito'
            };
        } catch (error) {
            throw new Error(`Error al generar el reporte: ${error.message}`);
        }
    }

    async getReceptionWalletsByCountry(countryId: string) {
        try {
            // Verificar que el país existe
            const country = await this.prisma.country.findUnique({
                where: { id: countryId }
            });

            if (!country) {
                throw new Error('País no encontrado');
            }

            // Buscar todas las wallets de recepción para este país, incluyendo información del propietario
            const receptionWallets = await this.prisma.wallet.findMany({
                where: {
                    countryId: countryId,
                    type: 'RECEPCION'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            user: true // username
                        }
                    },
                    country: {
                        select: {
                            name: true,
                            abbreviation: true,
                            currency: true
                        }
                    }
                },
                orderBy: {
                    balance: 'desc' // Ordenar por balance de mayor a menor
                }
            });

            const ratePurchase = parseFloat(country.rate_purchase?.toString() || '1');
            const rateSales = parseFloat(country.rate_sales?.toString() || '1');
            const rateWholesale = parseFloat(country.rate_sales.toString());

            // Formatear la respuesta incluyendo cálculos de USDT
            const walletsFormatted = receptionWallets.map(wallet => {
                const balance = parseFloat(wallet.balance.toString());
                const balanceUSDT = rateWholesale > 0 ? balance / rateWholesale : 0;

                return {
                    id: wallet.id,
                    balance: balance,
                    rateWholesale: rateWholesale,
                    balanceUSDT: balanceUSDT,
                    type: wallet.type,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt,
                    owner: {
                        id: wallet.user?.id,
                        name: wallet.user?.name,
                        username: wallet.user?.user
                    },
                    country: wallet.country
                };
            });

            // Calcular totales incluyendo USDT
            const totalBalance = walletsFormatted.reduce((sum, wallet) => sum + wallet.balance, 0);
            const totalBalanceUSDT = walletsFormatted.reduce((sum, wallet) => sum + wallet.balanceUSDT, 0);

            return {
                module: 'Reports',
                data: {
                    country: {
                        id: country.id,
                        name: country.name,
                        abbreviation: country.abbreviation,
                        currency: country.currency,
                        rateWholesale: rateWholesale
                    },
                    wallets: walletsFormatted,
                    summary: {
                        totalWallets: walletsFormatted.length,
                        totalBalance: totalBalance,
                        totalBalanceUSDT: totalBalanceUSDT
                    }
                },
                message: `Wallets de recepción del país ${country.name} obtenidas con éxito`
            };
        } catch (error) {
            throw new Error(`Error al obtener wallets de recepción: ${error.message}`);
        }
    }

    async getUserDailyOperations(userId: string) {
        try {
            // Obtener el inicio y fin del día actual
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Obtener todas las transacciones del usuario en el día actual
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    creadorId: userId,
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: {
                    origen: true,
                    destino: true,
                    instrument: true,
                    cliente: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Contar transacciones por estado
            const countCreada = transactions.filter(t => t.status === 'CREADA').length;
            const countCompletada = transactions.filter(t => t.status === 'COMPLETADA').length;
            const countObservada = transactions.filter(t => t.status === 'OBSERVADA').length;
            const countAnulada = transactions.filter(t => t.status === 'ANULADA').length;

            return {
                module: 'Reports',
                data: {
                    userId: userId,
                    date: startOfDay.toISOString().split('T')[0],
                    transactions: transactions,
                    summary: {
                        total: transactions.length,
                        creada: countCreada,
                        completada: countCompletada,
                        observada: countObservada,
                        anulada: countAnulada
                    }
                },
                message: 'Operaciones del usuario obtenidas con éxito'
            };
        } catch (error) {
            throw new Error(`Error al obtener operaciones del usuario: ${error.message}`);
        }
    }

    async getDailyGanancias(fechaInicio?: string, fechaFin?: string, paisOrigen?: string) {
        try {
            let start: Date;
            let end: Date;

            if (fechaInicio) {
                const [y, m, d] = fechaInicio.split('-').map(Number);
                start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
            } else {
                start = new Date();
                start.setHours(0, 0, 0, 0);
            }

            if (fechaFin) {
                const [y2, m2, d2] = fechaFin.split('-').map(Number);
                end = new Date(y2, (m2 || 1) - 1, d2 || 1, 23, 59, 59, 999);
            } else {
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
            }

            const where: any = {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            };
            if (paisOrigen) {
                where.origenId = paisOrigen;
            }

            where.status = 'COMPLETADA';

            const transactions = await this.prisma.transaction.findMany({
                where,
                select: {
                    publicId: true,
                    montoOrigen: true,
                    gananciaPanet: true,
                    createdAt: true,
                    origen: {
                        select: {
                            id: true,
                            name: true,
                            abbreviation: true,
                            currency: true,
                            rate_purchase: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const txs = transactions.map(t => ({
                numero: t.publicId,
                monto_origen: parseFloat(t.montoOrigen.toString()),
                ganancia_panet: parseFloat(t.gananciaPanet.toString()),
                fecha: t.createdAt,
                pais_origen: t.origen?.name,
            }));

            const countryMap = new Map<string, {
                countryId: string,
                name: string,
                abbreviation: string,
                currency: string,
                ratePurchase: number,
                totalAmount: number,
                totalUSDT: number,
            }>();

            for (const t of transactions) {
                if (!t.origen) continue;
                const key = t.origen.id;
                const amount = parseFloat(t.gananciaPanet.toString());
                const ratePurchase = parseFloat(t.origen.rate_purchase?.toString() || '1');
                const prev = countryMap.get(key);
                if (!prev) {
                    const totalAmount = amount;
                    const totalUSDT = ratePurchase > 0 ? totalAmount / ratePurchase : 0;
                    countryMap.set(key, {
                        countryId: t.origen.id,
                        name: t.origen.name,
                        abbreviation: t.origen.abbreviation,
                        currency: t.origen.currency,
                        ratePurchase,
                        totalAmount,
                        totalUSDT,
                    });
                } else {
                    prev.totalAmount += amount;
                    prev.totalUSDT = prev.ratePurchase > 0 ? prev.totalAmount / prev.ratePurchase : 0;
                }
            }

            const countries = Array.from(countryMap.values());
            const totals = {
                totalTransactions: txs.length,
                totalAmount: countries.reduce((s, c) => s + c.totalAmount, 0),
                totalUSDT: countries.reduce((s, c) => s + c.totalUSDT, 0),
            };

            return {
                module: 'Reports',
                data: {
                    filters: {
                        fecha_inicio: start,
                        fecha_fin: end,
                        pais_origen: paisOrigen || null,
                    },
                    transactions: txs,
                    per_country: countries,
                    summary: totals,
                },
                message: 'Reporte de ganancias y montos por país obtenido con éxito',
            };
        } catch (error) {
            throw new Error(`Error al obtener ganancias diarias: ${error.message}`);
        }
    }
}
