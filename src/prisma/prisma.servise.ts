// src/prisma/prisma.servise.ts - CÓDIGO CORREGIDO

import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        super({
            // SOLUCIÓN: Usar la estructura 'datasources'
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            // Opcionalmente, puedes añadir logs, etc. aquí:
            // log: ['query'],
        });
    }

    async onModuleInit() {
        await this.$connect()
    }
}