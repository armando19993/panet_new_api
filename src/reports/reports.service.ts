import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class ReportsService {

    constructor(
        private readonly prisma: PrismaService
    ) { }
    
    async home() {
        try {
            // Obtener todos los países
            const countriesResponse = await this.prisma.country.findMany();
            const countries = countriesResponse;

            // Calcular la fecha de hace 15 días
            const fifteenDaysAgo = new Date();

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
                                gte: fifteenDaysAgo
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
                                gte: fifteenDaysAgo
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

            return {
                module: 'Reports',
                data: {
                    countries: countryReports,
                    summary: {
                        totalCountries: countryReports.length,
                        totalUSDTAllCountries: totalUSDTAllCountries
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
}
