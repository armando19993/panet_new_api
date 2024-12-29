import { Injectable } from '@nestjs/common';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class RateService {

  constructor(private prisma: PrismaService) { }

  create(createRateDto: CreateRateDto) {
    return 'This action adds a new rate';
  }

  async findAll(query) {
    const { originId, destinationId } = query;
    let data = null
    const filters: any = {};
    if (originId) {
      filters.originId = originId;
    }
    if (destinationId) {
      filters.destinationId = destinationId;
    }

    if (originId || destinationId) {
      data = await this.prisma.rate.findFirst({
        where: filters,
        include: { origin: true, destination: true },
      });
    }
    else {
      const data = await this.prisma.rate.findMany({
        include: { origin: true, destination: true },
      });
    }


    return { data, message: 'Tasas obtenidas con éxito' };
  }


  findOne(id: number) {
    return `This action returns a #${id} rate`;
  }

  async update() {
    const countries = await this.prisma.country.findMany();
    let type_profit = "";

    await Promise.all(countries.map(async (origin) => {
      const idOrigen = origin.id;
      await Promise.all(countries.map(async (destination) => {
        let calculo = 0;

        if (origin.name === "VENEZUELA") {
          // Venezuela a otro país que no sea Colombia
          if (destination.name !== "COLOMBIA") {
            const rateWholesale = parseFloat(destination.rate_wholesale?.toString() || "0");
            const especialProfit = parseFloat(destination.especial_profit?.toString() || "0");

            if (isNaN(rateWholesale) || isNaN(especialProfit)) {
              console.warn(
                `Campos no válidos para cálculo de destino diferente a COLOMBIA. rate_wholesale: ${destination.rate_wholesale}, especial_profit: ${destination.especial_profit}`
              );
              return;
            }

            const punto = rateWholesale / 100;
            const porcentaje = punto * especialProfit;
            const generar = rateWholesale + porcentaje;

            calculo = generar;

            console.log(`Cálculo para destino diferente a COLOMBIA: rate_wholesale=${rateWholesale}, especial_profit=${especialProfit}, resultado=${calculo}`);
          }

          // Venezuela a Colombia
          if (destination.name === "COLOMBIA") {
            const rateWholesale = parseFloat(destination.rate_wholesale?.toString() || "0");
            const especialProfit = parseFloat(destination.especial_profit?.toString() || "0");

            if (isNaN(rateWholesale) || isNaN(especialProfit)) {
              console.warn(
                `Campos no válidos para cálculo hacia COLOMBIA. rate_wholesale: ${destination.rate_wholesale}, especial_profit: ${destination.especial_profit}`
              );
              return;
            }

            const punto = rateWholesale / 100;
            const restar = punto * especialProfit;
            const generar = rateWholesale - restar;

            calculo = generar;

            console.log(`Cálculo para COLOMBIA: rate_wholesale=${rateWholesale}, especial_profit=${especialProfit}, resultado=${calculo}`);
          }
        }

        if (origin.name === "COLOMBIA") {
          // De Colombia a Venezuela
          if (destination.name === "VENEZUELA") {
            const ratePurchaseOrigin = parseFloat(origin.rate_purchase?.toString() || "0");
            const rateSalesDestination = parseFloat(destination.rate_sales?.toString() || "0");
            const profitDestination = parseFloat(destination.profit?.toString() || "0");

            if (isNaN(ratePurchaseOrigin) || isNaN(rateSalesDestination) || isNaN(profitDestination)) {
              console.warn(
                `Campos no válidos para cálculo de Colombia a Venezuela. rate_purchase: ${origin.rate_purchase}, rate_sales: ${destination.rate_sales}, profit: ${destination.profit}`
              );
              return;
            }

            const mayor = ratePurchaseOrigin / rateSalesDestination;
            const punto = mayor / 100;
            const restar = punto * profitDestination;
            const generar = mayor + restar;

            calculo = generar;

            console.log(`Cálculo de Colombia a Venezuela: mayor=${mayor}, profit=${profitDestination}, resultado=${calculo}`);
          }
          // De Colombia a otros países
          else {
            const rateSalesDestination = parseFloat(destination.rate_sales?.toString() || "0");
            const ratePurchaseOrigin = parseFloat(origin.rate_purchase?.toString() || "0");
            const profitDestination = parseFloat(destination.profit?.toString() || "0");

            if (isNaN(rateSalesDestination) || isNaN(ratePurchaseOrigin) || isNaN(profitDestination)) {
              console.warn(
                `Campos no válidos para cálculo de Colombia a otros países. rate_sales: ${destination.rate_sales}, rate_purchase: ${origin.rate_purchase}, profit: ${destination.profit}`
              );
              return;
            }

            const mayor = rateSalesDestination / ratePurchaseOrigin;
            const punto = mayor / 100;
            const restar = punto * profitDestination;
            const generar = mayor - restar;

            calculo = generar;

            console.log(`Cálculo de Colombia a otros países: mayor=${mayor}, profit=${profitDestination}, resultado=${calculo}`);
          }
        }

        if (origin.name !== "COLOMBIA" && origin.name !== "VENEZUELA") {
          const rateSalesDestination = parseFloat(destination.rate_sales?.toString() || "0");
          const ratePurchaseOrigin = parseFloat(origin.rate_purchase?.toString() || "0");

          if (isNaN(rateSalesDestination) || isNaN(ratePurchaseOrigin)) {
            console.warn(
              `Campos no válidos para cálculo de origen distinto a COLOMBIA y VENEZUELA. rate_sales: ${destination.rate_sales}, rate_purchase: ${origin.rate_purchase}`
            );
            return;
          }

          const montoInicial = rateSalesDestination / ratePurchaseOrigin;
          const punto = montoInicial / 100;

          let profitValue = "0";
          if (destination.name === "VENEZUELA") {
            profitValue = origin.ven_profit?.toString() || "0";
          } else {
            profitValue = origin.profit?.toString() || "0";
          }

          const porcentaje = parseFloat(profitValue);
          if (isNaN(porcentaje)) {
            console.warn(
              `Campo no válido para profit. ven_profit: ${origin.ven_profit}, profit: ${origin.profit}`
            );
            return;
          }

          const restar = punto * porcentaje;
          const resultado = montoInicial - restar;

          calculo = resultado;

          console.log(`Cálculo de origen distinto a COLOMBIA y VENEZUELA: montoInicial=${montoInicial}, profit=${porcentaje}, resultado=${calculo}`);
        }

        if (origin.name === "VENEZUELA") {
          type_profit = "especial_profit";
        }
        if (origin.name === "COLOMBIA") {
          type_profit = "especial_profit";
        }
        if (origin.name !== "VENEZUELA" && origin.name !== "COLOMBIA") {
          if (destination.name === "VENEZUELA") {
            type_profit = "ven_profit";
          } else {
            type_profit = "profit";
          }
        }

        let assigment = type_profit;

        const vExist = await this.prisma.rate.findFirst({
          where: {
            originId: idOrigen,
            destinationId: destination.id
          }
        })

        if (typeof calculo === 'number' && calculo > 0) {
          if (vExist === null) {
            await this.prisma.rate.create({
              data: {
                origin: {
                  connect: {
                    id: idOrigen
                  }
                },
                destination: {
                  connect: {
                    id: destination.id
                  }
                },
                amount: calculo,
                type_profit: assigment
              }
            });
          } else {
            await this.prisma.rate.update({
              where: {
                id: vExist.id
              },
              data: {
                amount: calculo,
                type_profit: assigment
              }
            });
          }
        }

      }))
    }))
  }

  remove(id: number) {
    return `This action removes a #${id} rate`;
  }
}
